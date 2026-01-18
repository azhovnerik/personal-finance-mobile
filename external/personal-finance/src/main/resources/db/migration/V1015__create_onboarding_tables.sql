-- Creates onboarding related tables and seeds templates

CREATE TABLE IF NOT EXISTS category_template
(
    id               UUID PRIMARY KEY,
    code             VARCHAR(100) UNIQUE NOT NULL,
    type             VARCHAR(20)         NOT NULL,
    group_code       VARCHAR(50)         NULL,
    popularity_score INT       DEFAULT 0,
    default_color    VARCHAR(7)          NULL,
    icon             VARCHAR(50)         NULL,
    created_at       TIMESTAMP DEFAULT now(),
    updated_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS category_template_i18n
(
    id          UUID PRIMARY KEY,
    template_id UUID REFERENCES category_template (id),
    locale      VARCHAR(10)  NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    UNIQUE (template_id, locale)
);

CREATE TABLE IF NOT EXISTS onboarding_state
(
    id          UUID PRIMARY KEY,
    user_id      uuid      not null,
    is_completed boolean   not null,
    completed_at TIMESTAMP NULL,
    constraint fk_onboarding_user foreign key (user_id) references users,
    constraint uq_onboarding_user unique (user_id)
);

-- mark existing users as completed
INSERT INTO onboarding_state (id, user_id, is_completed, completed_at)
SELECT gen_random_uuid(),id, TRUE, now()
FROM users
ON CONFLICT DO NOTHING;

-- seed category templates
INSERT INTO category_template (id, code, type)
VALUES (gen_random_uuid(), 'SALARY', 'INCOME'),
       (gen_random_uuid(), 'BONUS', 'INCOME'),
       (gen_random_uuid(), 'FREELANCE', 'INCOME'),
       (gen_random_uuid(), 'INTEREST', 'INCOME'),
       (gen_random_uuid(), 'DIVIDENDS', 'INCOME'),
       (gen_random_uuid(), 'RENT', 'INCOME'),
       (gen_random_uuid(), 'CASHBACK', 'INCOME'),
       (gen_random_uuid(), 'GIFTS_IN', 'INCOME'),
       (gen_random_uuid(), 'OTHER_INCOME', 'INCOME'),
       (gen_random_uuid(), 'GROCERIES', 'EXPENSES'),
       (gen_random_uuid(), 'RESTAURANTS', 'EXPENSES'),
       (gen_random_uuid(), 'TRANSPORT', 'EXPENSES'),
       (gen_random_uuid(), 'RENT_HOME', 'EXPENSES'),
       (gen_random_uuid(), 'UTILITIES', 'EXPENSES'),
       (gen_random_uuid(), 'MOBILE_INTERNET', 'EXPENSES'),
       (gen_random_uuid(), 'HEALTH_PHARMACY', 'EXPENSES'),
       (gen_random_uuid(), 'CLOTHES', 'EXPENSES'),
       (gen_random_uuid(), 'ENTERTAINMENT', 'EXPENSES'),
       (gen_random_uuid(), 'SUBSCRIPTIONS', 'EXPENSES'),
       (gen_random_uuid(), 'TRAVEL', 'EXPENSES'),
       (gen_random_uuid(), 'KIDS', 'EXPENSES'),
       (gen_random_uuid(), 'AUTO_FUEL', 'EXPENSES'),
       (gen_random_uuid(), 'AUTO_INSURANCE', 'EXPENSES'),
       (gen_random_uuid(), 'AUTO_SERVICE', 'EXPENSES'),
       (gen_random_uuid(), 'REPAIRS', 'EXPENSES'),
       (gen_random_uuid(), 'GIFTS_OUT', 'EXPENSES'),
       (gen_random_uuid(), 'SPORT_HOBBY', 'EXPENSES'),
       (gen_random_uuid(), 'TAXES', 'EXPENSES'),
       (gen_random_uuid(), 'CHARITY', 'EXPENSES'),
       (gen_random_uuid(), 'INVESTMENTS_SAVINGS', 'EXPENSES'),
       (gen_random_uuid(), 'OTHER_EXPENSE', 'EXPENSES')
ON CONFLICT (code) DO NOTHING;

-- translations
INSERT INTO category_template_i18n (id, template_id, locale, name)
VALUES (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'SALARY'), 'en', 'Salary'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'SALARY'), 'ua', 'Зарплата'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'BONUS'), 'en', 'Bonus'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'BONUS'), 'ua', 'Бонус'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'FREELANCE'), 'en', 'Freelance'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'FREELANCE'), 'ua', 'Фріланс'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'INTEREST'), 'en', 'Interest'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'INTEREST'), 'ua', 'Відсотки'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'DIVIDENDS'), 'en', 'Dividends'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'DIVIDENDS'), 'ua', 'Дивіденди'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'RENT'), 'en', 'Rent'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'RENT'), 'ua', 'Оренда'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'CASHBACK'), 'en', 'Cashback'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'CASHBACK'), 'ua', 'Кешбек'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'GIFTS_IN'), 'en', 'Gifts'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'GIFTS_IN'), 'ua', 'Подарунки'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'OTHER_INCOME'), 'en', 'Other income'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'OTHER_INCOME'), 'ua', 'Інші доходи'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'GROCERIES'), 'en', 'Groceries'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'GROCERIES'), 'ua', 'Продукти'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'RESTAURANTS'), 'en', 'Restaurants'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'RESTAURANTS'), 'ua', 'Ресторани'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'TRANSPORT'), 'en', 'Transport'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'TRANSPORT'), 'ua', 'Транспорт'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'RENT_HOME'), 'en', 'Home rent'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'RENT_HOME'), 'ua', 'Оренда житла'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'UTILITIES'), 'en', 'Utilities'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'UTILITIES'), 'ua', 'Комунальні послуги'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'MOBILE_INTERNET'), 'en', 'Mobile/Internet'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'MOBILE_INTERNET'), 'ua', 'Мобільний інтернет'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'HEALTH_PHARMACY'), 'en', 'Health & Pharmacy'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'HEALTH_PHARMACY'), 'ua', 'Здоров"я та аптека'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'CLOTHES'), 'en', 'Clothes'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'CLOTHES'), 'ua', 'Одяг'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'ENTERTAINMENT'), 'en', 'Entertainment'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'ENTERTAINMENT'), 'ua', 'Розваги'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'SUBSCRIPTIONS'), 'en', 'Subscriptions'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'SUBSCRIPTIONS'), 'ua', 'Підписки'),
       (gen_random_uuid(),(SELECT id FROM category_template WHERE code = 'TRAVEL'), 'en', 'Travel'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'TRAVEL'), 'ua', 'Подорожі'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'KIDS'), 'en', 'Kids'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'KIDS'), 'ua', 'Діти'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'AUTO_FUEL'), 'en', 'Auto fuel'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'AUTO_FUEL'), 'ua', 'Паливо'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'AUTO_INSURANCE'), 'en', 'Auto insurance'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'AUTO_INSURANCE'), 'ua', 'Автострахування'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'AUTO_SERVICE'), 'en', 'Auto service'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'AUTO_SERVICE'), 'ua', 'Автосервіс'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'REPAIRS'), 'en', 'Repairs'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'REPAIRS'), 'ua', 'Ремонти'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'GIFTS_OUT'), 'en', 'Gifts'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'GIFTS_OUT'), 'ua', 'Подарунки'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'SPORT_HOBBY'), 'en', 'Sport & Hobby'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'SPORT_HOBBY'), 'ua', 'Спорт та хобі'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'TAXES'), 'en', 'Taxes'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'TAXES'), 'ua', 'Податки'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'CHARITY'), 'en', 'Charity'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'CHARITY'), 'ua', 'Благодійність'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'INVESTMENTS_SAVINGS'), 'en', 'Investments & Savings'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'INVESTMENTS_SAVINGS'), 'ua', 'Інвестиції та заощадження'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'OTHER_EXPENSE'), 'en', 'Other expense'),
       (gen_random_uuid(), (SELECT id FROM category_template WHERE code = 'OTHER_EXPENSE'), 'ua', 'Інші витрати')
ON CONFLICT (template_id, locale) DO NOTHING;
