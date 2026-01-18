package com.example.personalFinance.service.Impl;

import com.example.personalFinance.config.IntegrationTest;
import com.example.personalFinance.config.IntegrationTestBase;
import com.example.personalFinance.exception.CurrencyMismatchException;
import com.example.personalFinance.model.Account;
import com.example.personalFinance.model.AccountType;
import com.example.personalFinance.model.CurrencyCode;
import com.example.personalFinance.model.Transaction;
import com.example.personalFinance.model.TransactionDirection;
import com.example.personalFinance.model.Transfer;
import com.example.personalFinance.model.TransactionType;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.repository.TransactionRepository;
import com.example.personalFinance.repository.TransferRepository;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.TransferService;
import com.example.personalFinance.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.jdbc.JdbcTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static com.example.personalFinance.service.Impl.TestUtilities.createAccount;
import static com.example.personalFinance.service.Impl.TestUtilities.createTransfer;
import static com.example.personalFinance.service.Impl.TestUtilities.createUser;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@IntegrationTest
class TransferServiceImplTest extends IntegrationTestBase {

    @Autowired
    private TransferService transferService;

    @Autowired
    private TransferRepository transferRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private AccountService accountService;

    @BeforeEach
    void clearDatabase(@Autowired JdbcTemplate jdbcTemplate) {
        JdbcTestUtils.deleteFromTables(jdbcTemplate,
                "subscription_event_log",
                "user_subscription",
                "transaction",
                "transfer",
                "budget_categories",
                "category",
                "budget",
                "account",
                "onboarding_state",
                "users");
    }

    @Test
    @DisplayName("should create transfer with two synchronized transactions")
    void shouldCreateTransferWithTransactions() {
        UserApp user = createUser(userService, "user@pf.app", "user", TestUtilities.STRONG_TEST_PASSWORD);
        Account fromAccount = createAccount(accountService, "from", AccountType.CASH, user);
        Account toAccount = createAccount(accountService, "to", AccountType.CARD, user);

        Transfer transfer = Transfer.builder()
                .comment("Initial transfer")
                .date(1_000L)
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .build();

        Transfer saved = transferService.create(user.getId(), transfer, BigDecimal.valueOf(150));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getUserId()).isEqualTo(user.getId());

        List<Transaction> transactions = transactionRepository.findByTransferId(saved.getId());
        assertThat(transactions).hasSize(2);
        assertThat(transactions).allMatch(transaction -> transaction.getType() == TransactionType.TRANSFER);
        assertThat(transactions)
                .extracting(Transaction::getDirection)
                .containsExactlyInAnyOrder(TransactionDirection.DECREASE, TransactionDirection.INCREASE);
        Transaction decrease = transactions.stream().filter(t -> t.getDirection() == TransactionDirection.DECREASE).findFirst().orElseThrow();
        Transaction increase = transactions.stream().filter(t -> t.getDirection() == TransactionDirection.INCREASE).findFirst().orElseThrow();

        assertThat(decrease.getAccount().getId()).isEqualTo(fromAccount.getId());
        assertThat(increase.getAccount().getId()).isEqualTo(toAccount.getId());
        assertThat(decrease.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(150));
        assertThat(increase.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(150));
        assertThat(decrease.getCurrency()).isEqualTo(fromAccount.getCurrency());
        assertThat(increase.getCurrency()).isEqualTo(toAccount.getCurrency());
    }

    @Test
    @DisplayName("should update transfer and keep transactions synchronized")
    void shouldUpdateTransferAndTransactions() {
        UserApp user = createUser(userService, "update@pf.app", "upd", TestUtilities.STRONG_TEST_PASSWORD);
        Account fromAccount = createAccount(accountService, "source", AccountType.CASH, user);
        Account firstToAccount = createAccount(accountService, "destination", AccountType.CARD, user);
        Account secondToAccount = createAccount(accountService, "destination-2", AccountType.CARD, user);

        Transfer transfer = Transfer.builder()
                .comment("Transfer comment")
                .date(5_000L)
                .fromAccount(fromAccount)
                .toAccount(firstToAccount)
                .build();

        Transfer saved = transferService.create(user.getId(), transfer, BigDecimal.valueOf(200));

        saved.setComment("Updated comment");
        saved.setDate(7_000L);
        saved.setToAccount(secondToAccount);

        Transfer updated = transferService.update(user.getId(), saved, BigDecimal.valueOf(350));

        assertThat(updated.getComment()).isEqualTo("Updated comment");
        assertThat(updated.getToAccount().getId()).isEqualTo(secondToAccount.getId());

        List<Transaction> transactions = transactionRepository.findByTransferId(updated.getId());
        assertThat(transactions).hasSize(2);
        Transaction decrease = transactions.stream().filter(t -> t.getDirection() == TransactionDirection.DECREASE).findFirst().orElseThrow();
        Transaction increase = transactions.stream().filter(t -> t.getDirection() == TransactionDirection.INCREASE).findFirst().orElseThrow();

        assertThat(decrease.getAccount().getId()).isEqualTo(fromAccount.getId());
        assertThat(increase.getAccount().getId()).isEqualTo(secondToAccount.getId());
        assertThat(decrease.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(350));
        assertThat(increase.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(350));
        assertThat(decrease.getDate()).isEqualTo(7_000L);
        assertThat(increase.getDate()).isEqualTo(7_000L);
        assertThat(decrease.getComment()).isEqualTo("Updated comment");
        assertThat(increase.getComment()).isEqualTo("Updated comment");
    }

    @Test
    @DisplayName("should delete transfer and related transactions")
    void shouldDeleteTransfer() {
        UserApp user = createUser(userService, "delete@pf.app", "del", TestUtilities.STRONG_TEST_PASSWORD);
        Account fromAccount = createAccount(accountService, "acc-1", AccountType.CASH, user);
        Account toAccount = createAccount(accountService, "acc-2", AccountType.CARD, user);

        Transfer transfer = Transfer.builder()
                .comment("To delete")
                .date(10_000L)
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .build();

        Transfer saved = transferService.create(user.getId(), transfer, BigDecimal.valueOf(50));

        transferService.delete(user.getId(), saved.getId());

        assertThat(transferRepository.findById(saved.getId())).isEmpty();
        assertThat(transactionRepository.findByTransferId(saved.getId())).isEmpty();
    }

    @Test
    @DisplayName("should reject transfer between accounts with different currencies")
    void shouldRejectCurrencyMismatch() {
        UserApp user = createUser(userService, "currency@pf.app", "currency", TestUtilities.STRONG_TEST_PASSWORD);
        Account fromAccount = createAccount(accountService, "usd", AccountType.CASH, user);
        Account toAccount = createAccount(accountService, "eur", AccountType.CARD, user);
        toAccount.setCurrency(CurrencyCode.EUR);
        accountService.save(user.getId(), toAccount);

        Transfer transfer = Transfer.builder()
                .comment("Currency mismatch")
                .date(2_000L)
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .build();

        assertThrows(CurrencyMismatchException.class,
                () -> transferService.create(user.getId(), transfer, BigDecimal.valueOf(10)));
    }

    @Test
    @DisplayName("should expose transfer details via finder methods")
    void shouldFindTransfersViaFinders() {
        UserApp user = createUser(userService, "finder@pf.app", "finder", TestUtilities.STRONG_TEST_PASSWORD);
        Account source = createAccount(accountService, "source", AccountType.CARD, user);
        Account destination = createAccount(accountService, "destination", AccountType.BANK_ACCOUNT, user);
        Account anotherDestination = createAccount(accountService, "destination-2", AccountType.CARD, user);

        Transfer first = createTransfer(transferService, user, source, destination, 11_000L,
                BigDecimal.valueOf(250), "First transfer");
        Transfer second = createTransfer(transferService, user, destination, anotherDestination, 12_000L,
                BigDecimal.valueOf(125), "Second transfer");

        UserApp otherUser = createUser(userService, "other@pf.app", "other", TestUtilities.STRONG_TEST_PASSWORD);
        Account outsiderSource = createAccount(accountService, "outsider", AccountType.CARD, otherUser);
        Account outsiderTarget = createAccount(accountService, "outsider-2", AccountType.CARD, otherUser);
        createTransfer(transferService, otherUser, outsiderSource, outsiderTarget, 13_000L,
                BigDecimal.valueOf(500), "Other transfer");

        List<Transfer> userTransfers = transferService.findByUserId(user.getId());
        assertThat(userTransfers).hasSize(2);
        assertThat(userTransfers)
                .extracting(Transfer::getComment)
                .containsExactlyInAnyOrder("First transfer", "Second transfer");

        assertThat(transferService.findByUserIdAndId(user.getId(), first.getId()))
                .isPresent()
                .get()
                .extracting(Transfer::getComment)
                .isEqualTo("First transfer");

        assertThat(transferService.findTransferAmount(user.getId(), first.getId()))
                .contains(BigDecimal.valueOf(250).setScale(2));

        Page<Transfer> fromPage = transferService.findByUserIdAndAccount(user.getId(), source.getId(), PageRequest.of(0, 10));
        assertThat(fromPage.getTotalElements()).isEqualTo(1);
        assertThat(fromPage.getContent().get(0).getComment()).isEqualTo("First transfer");

        Page<Transfer> middlePage = transferService.findByUserIdAndAccount(user.getId(), destination.getId(), PageRequest.of(0, 10));
        assertThat(middlePage.getTotalElements()).isEqualTo(2);

        assertThat(transferService.findTransferAmount(user.getId(), UUID.randomUUID())).isEmpty();
    }

    @Test
    @DisplayName("should reject transfer when accounts are missing")
    void shouldRejectWhenAccountsMissing() {
        UserApp user = createUser(userService, "missing@pf.app", "missing", TestUtilities.STRONG_TEST_PASSWORD);
        Transfer transfer = Transfer.builder()
                .comment("No accounts")
                .date(1_000L)
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> transferService.create(user.getId(), transfer, BigDecimal.TEN));
    }

    @Test
    @DisplayName("should reject transfer when accounts are not persisted")
    void shouldRejectWhenAccountsNotPersisted() {
        UserApp user = createUser(userService, "notpersisted@pf.app", "np", TestUtilities.STRONG_TEST_PASSWORD);
        Account fromAccount = Account.builder()
                .name("temp-from")
                .description("temp-from")
                .userId(user.getId())
                .type(AccountType.CASH)
                .currency(CurrencyCode.USD)
                .build();
        Account toAccount = Account.builder()
                .name("temp-to")
                .description("temp-to")
                .userId(user.getId())
                .type(AccountType.CARD)
                .currency(CurrencyCode.USD)
                .build();

        Transfer transfer = Transfer.builder()
                .comment("Non persisted")
                .date(2_000L)
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> transferService.create(user.getId(), transfer, BigDecimal.ONE));
    }

    @Test
    @DisplayName("should reject transfer when accounts belong to different users")
    void shouldRejectWhenAccountsBelongToDifferentUsers() {
        UserApp owner = createUser(userService, "owner@pf.app", "owner", TestUtilities.STRONG_TEST_PASSWORD);
        UserApp foreign = createUser(userService, "foreign@pf.app", "foreign", TestUtilities.STRONG_TEST_PASSWORD);

        Account ownerAccount = createAccount(accountService, "owner-acc", AccountType.CASH, owner);
        Account foreignAccount = createAccount(accountService, "foreign-acc", AccountType.CARD, foreign);

        Transfer transfer = Transfer.builder()
                .comment("Wrong ownership")
                .date(3_000L)
                .fromAccount(ownerAccount)
                .toAccount(foreignAccount)
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> transferService.create(owner.getId(), transfer, BigDecimal.valueOf(100)));
    }

    @Test
    @DisplayName("should reject transfer when amount is not positive")
    void shouldRejectWhenAmountNotPositive() {
        UserApp user = createUser(userService, "amount@pf.app", "amount", TestUtilities.STRONG_TEST_PASSWORD);
        Account fromAccount = createAccount(accountService, "from-amount", AccountType.CARD, user);
        Account toAccount = createAccount(accountService, "to-amount", AccountType.CARD, user);

        Transfer transfer = Transfer.builder()
                .comment("Invalid amount")
                .date(4_000L)
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> transferService.create(user.getId(), transfer, BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class,
                () -> transferService.create(user.getId(), transfer, null));
    }

    @Test
    @DisplayName("should reject transfer when date is missing")
    void shouldRejectWhenDateMissing() {
        UserApp user = createUser(userService, "date@pf.app", "date", TestUtilities.STRONG_TEST_PASSWORD);
        Account fromAccount = createAccount(accountService, "from-date", AccountType.CARD, user);
        Account toAccount = createAccount(accountService, "to-date", AccountType.CARD, user);

        Transfer transfer = Transfer.builder()
                .comment("Missing date")
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> transferService.create(user.getId(), transfer, BigDecimal.TEN));
    }

    @Test
    @DisplayName("should reject update when transfer identifier is missing")
    void shouldRejectUpdateWithoutIdentifier() {
        UserApp user = createUser(userService, "update-missing@pf.app", "upd-miss", TestUtilities.STRONG_TEST_PASSWORD);
        Account fromAccount = createAccount(accountService, "from-update", AccountType.CASH, user);
        Account toAccount = createAccount(accountService, "to-update", AccountType.CARD, user);

        Transfer transfer = Transfer.builder()
                .comment("No id")
                .date(5_000L)
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> transferService.update(user.getId(), transfer, BigDecimal.valueOf(50)));
    }
}
