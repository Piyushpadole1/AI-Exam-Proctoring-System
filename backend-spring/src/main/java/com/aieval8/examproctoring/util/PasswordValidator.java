package com.aieval8.examproctoring.util;

import java.util.regex.Pattern;

public class PasswordValidator {

    public static final String PASSWORD_REQUIREMENTS_MESSAGE =
            "Password must be at least 8 characters long and contain at least one uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), and one special character (e.g. @, #, $, %, !).";

    private static final Pattern UPPERCASE_PATTERN = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile("[a-z]");
    private static final Pattern DIGIT_PATTERN = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL_PATTERN = Pattern.compile("[^A-Za-z0-9]");

    public static boolean isValid(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        return UPPERCASE_PATTERN.matcher(password).find()
                && LOWERCASE_PATTERN.matcher(password).find()
                && DIGIT_PATTERN.matcher(password).find()
                && SPECIAL_PATTERN.matcher(password).find();
    }
}
