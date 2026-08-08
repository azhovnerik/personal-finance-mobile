import { getDeviceLocale, localizeSystemMessage, normalizeLocale, translate } from "../../src/localization";
import {useEffect, useMemo, useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {useRouter} from "expo-router";

import {getRegistrationSupportedLanguages, register as registerRequest} from "../../src/features/auth/api";
import type {ApiError} from "../../src/features/auth/api";
import type {SupportedLanguage} from "../../src/features/auth/types";
import {Button, Card, Input, ScreenContainer, Select, Text, colors, spacing} from "../../src/shared/ui";

const FALLBACK_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    {code: "ua", label: "Ukrainian"},
    {code: "en", label: "English"},
];

const resolveLanguageFromSupported = (supportedLanguages: SupportedLanguage[], deviceLocale: string | null, current?: string) => {
    if (supportedLanguages.length === 0) {
        return current ?? "en";
    }

    const byCode = new Map(supportedLanguages.map((item) => [item.code.toLowerCase(), item.code]));
    const candidates: string[] = [];

    if (current) {
        candidates.push(current.toLowerCase());
    }

    const normalizedLocale = deviceLocale?.replace("_", "-").toLowerCase();
    if (normalizedLocale) {
        candidates.push(normalizeLocale(normalizedLocale).toLowerCase());
        candidates.push(normalizedLocale);
        const base = normalizedLocale.split("-")[0] ?? normalizedLocale;
        candidates.push(base);
        if (base === "uk") {
            candidates.push("ua");
        }
        if (base === "ua") {
            candidates.push("uk");
        }
    }

    candidates.push("ua", "uk", "en");

    for (const candidate of candidates) {
        const exact = byCode.get(candidate);
        if (exact) {
            return exact;
        }
    }

    return supportedLanguages[0]!.code;
};

export default function RegisterScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [language, setLanguage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>(FALLBACK_SUPPORTED_LANGUAGES);
    const languageOptions = useMemo(
        () => supportedLanguages.map((item) => ({value: item.code, label: item.label})),
        [supportedLanguages],
    );

    useEffect(() => {
        let isMounted = true;

        void (async () => {
            try {
                const fromBackend = await getRegistrationSupportedLanguages();
                if (!isMounted || fromBackend.length === 0) {
                    return;
                }
                setSupportedLanguages(fromBackend);
                setLanguage((prev) => resolveLanguageFromSupported(fromBackend, getDeviceLocale(), prev));
            } catch {
                // keep local fallback options
                setLanguage((prev) => resolveLanguageFromSupported(FALLBACK_SUPPORTED_LANGUAGES, getDeviceLocale(), prev));
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (language) {
            return;
        }
        setLanguage(resolveLanguageFromSupported(supportedLanguages, getDeviceLocale()));
    }, [language, supportedLanguages]);

    const onSubmit = async () => {
        if (!email.trim() || !name.trim() || !password) {
            setError(translate("Enter your email, name, and password."));
            return;
        }
        if (password !== confirmPassword) {
            setError(translate("Passwords do not match."));
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const languageForSubmit = resolveLanguageFromSupported(supportedLanguages, getDeviceLocale(), language);
            const response = await registerRequest({
                email: email.trim(),
                name: name.trim(),
                password,
                language: languageForSubmit.trim() || undefined,
            });
            router.replace({
                pathname: "/auth/registration-success",
                params: {email: response.email},
            });
        } catch (rawError) {
            const apiError = rawError as ApiError;
            setError(localizeSystemMessage(apiError.message, "Unable to register."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const onClick = () => {
        const defaultPassword = process.env.EXPO_PUBLIC_DEFAULT_PASSWORD ?? "";
        setPassword(defaultPassword);
        setConfirmPassword(defaultPassword);
        setError(defaultPassword || null);
    }

    return (
        <ScreenContainer style={styles.screen}>
            <Card style={styles.card}>
                <Text variant="heading" style={styles.title}>{translate("Registration")}</Text>
                <Input placeholder={translate("Email")} autoCapitalize="none" keyboardType="email-address" value={email}
                       onChangeText={setEmail}/>
                <Input placeholder={translate("Name")} value={name} onChangeText={setName}/>
                <Text variant="caption">{translate("Interface language")}</Text>
                <Select
                    value={language}
                    options={languageOptions}
                    placeholder={translate("Interface language")}
                    onChange={setLanguage}
                />
                <View style={styles.passwordField}>
                    <Input
                        placeholder={translate("Password")}
                        secureTextEntry={!isPasswordVisible}
                        value={password}
                        onChangeText={setPassword}
                        style={styles.passwordInput}
                    />
                    <Pressable style={styles.passwordToggle} onPress={() => setIsPasswordVisible((prev) => !prev)}
                               hitSlop={8}>
                        <Text variant="caption" style={styles.passwordToggleText}>
                            {isPasswordVisible ? translate("Hide") : translate("Show")}
                        </Text>
                    </Pressable>
                </View>
                <View style={styles.passwordField}>
                    <Input
                        placeholder={translate("Confirm password")}
                        secureTextEntry={!isConfirmPasswordVisible}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={styles.passwordInput}
                    />
                    <Pressable
                        style={styles.passwordToggle}
                        onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}
                        hitSlop={8}
                    >
                        <Text variant="caption" style={styles.passwordToggleText}>
                            {isConfirmPasswordVisible ? translate("Hide") : translate("Show")}
                        </Text>
                    </Pressable>
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button title={isSubmitting ? translate("Creating...") : translate("Create account")} onPress={() => void onSubmit()}
                        disabled={isSubmitting}/>
                <Button title={translate("Back to sign in")} variant="outline" tone="secondary"
                        onPress={() => router.replace("/login")}/>
                <Button title={translate("Fill password")} variant="outline" tone="secondary" onPress={() => onClick()}/>
            </Card>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    screen: {
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        width: "100%",
        maxWidth: 380,
        gap: spacing.sm,
    },
    passwordField: {
        position: "relative",
    },
    passwordInput: {
        paddingRight: 92,
    },
    passwordToggle: {
        position: "absolute",
        right: spacing.md,
        top: 0,
        bottom: 0,
        justifyContent: "center",
    },
    passwordToggleText: {
        color: colors.primary,
    },
    title: {
        textAlign: "center",
    },
    error: {
        color: colors.danger,
    },
});
