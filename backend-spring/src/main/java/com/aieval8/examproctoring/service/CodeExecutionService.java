package com.aieval8.examproctoring.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CodeExecutionService {

    private static final Logger logger = LoggerFactory.getLogger(CodeExecutionService.class);
    private static final long TIMEOUT_SECONDS = 10L;
    private static final int MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB

    private final String javaCmd;
    private final String javacCmd;
    private final String pythonCmd;
    private final String nodeCmd;
    private final String gccCmd;
    private final String gppCmd;

    public CodeExecutionService() {
        this.javaCmd = resolveJavaCmd();
        this.javacCmd = resolveJavacCmd();
        this.pythonCmd = resolvePythonCmd();
        this.nodeCmd = resolveNodeCmd();
        this.gccCmd = resolveGccCmd();
        this.gppCmd = resolveGppCmd();

        logger.info("CodeExecutionService initialized with runtime paths:");
        logger.info("  Java: {}", javaCmd);
        logger.info("  Javac: {}", javacCmd);
        logger.info("  Python: {}", pythonCmd);
        logger.info("  Node: {}", nodeCmd);
        logger.info("  GCC: {}", gccCmd);
        logger.info("  G++: {}", gppCmd);
    }

    public static class ExecutionResult {
        private boolean success;
        private String output;
        private String error;
        private int exitCode;
        private long executionTimeMs;

        public ExecutionResult() {
        }

        public ExecutionResult(boolean success, String output, String error, int exitCode, long executionTimeMs) {
            this.success = success;
            this.output = output;
            this.error = error;
            this.exitCode = exitCode;
            this.executionTimeMs = executionTimeMs;
        }

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getOutput() {
            return output;
        }

        public void setOutput(String output) {
            this.output = output;
        }

        public String getError() {
            return error;
        }

        public void setError(String error) {
            this.error = error;
        }

        public int getExitCode() {
            return exitCode;
        }

        public void setExitCode(int exitCode) {
            this.exitCode = exitCode;
        }

        public long getExecutionTimeMs() {
            return executionTimeMs;
        }

        public void setExecutionTimeMs(long executionTimeMs) {
            this.executionTimeMs = executionTimeMs;
        }
    }

    public static class SecurityCheckResult {
        public final boolean isSafe;
        public final String reason;
        public SecurityCheckResult(boolean isSafe, String reason) {
            this.isSafe = isSafe;
            this.reason = reason;
        }
    }

    public SecurityCheckResult checkSecurity(String code, String language) {
        if (code == null) return new SecurityCheckResult(true, null);
        String lower = code.toLowerCase();
        String lang = language != null ? language.toLowerCase().trim() : "javascript";

        if (lang.contains("python") || lang.equals("py")) {
            if (lower.matches("(?s).*\\b(import\\s+(os|sys|subprocess|shutil|socket|requests|urllib|pty)|from\\s+(os|sys|subprocess|shutil|socket|requests|urllib)\\s+import).*")) {
                return new SecurityCheckResult(false, "Restricted module import detected (os, sys, subprocess, socket, network).");
            }
            if (lower.contains("__import__") || lower.contains("eval(") || lower.contains("exec(") || lower.contains("open(")) {
                return new SecurityCheckResult(false, "Restricted function call detected (eval, exec, open, __import__).");
            }
        } else if (lang.contains("java")) {
            if (lower.contains("runtime.getruntime") || lower.contains("processbuilder") || lower.contains("system.exit") || lower.contains("java.io.file") || lower.contains("java.net.") || lower.contains("java.lang.reflect")) {
                return new SecurityCheckResult(false, "Restricted class/method call detected (Runtime, ProcessBuilder, System.exit, File, Network, Reflection).");
            }
        } else if (lang.contains("javascript") || lang.contains("node") || lang.equals("js")) {
            if (lower.contains("child_process") || lower.contains("require('fs')") || lower.contains("require(\"fs\")") || lower.contains("require('net')") || lower.contains("require('http')") || lower.contains("process.exit") || lower.contains("process.env")) {
                return new SecurityCheckResult(false, "Restricted Node.js module access detected (child_process, fs, net, http, process).");
            }
        } else if (lang.contains("c") || lang.contains("cpp")) {
            if (lower.contains("system(") || lower.contains("popen(") || lower.contains("fork(") || lower.contains("exec(") || lower.contains("<windows.h>") || lower.contains("<unistd.h>") || lower.contains("<sys/socket.h>") || lower.contains("fopen(")) {
                return new SecurityCheckResult(false, "Restricted system call or header detected (system, fork, exec, socket, file IO).");
            }
        }
        return new SecurityCheckResult(true, null);
    }

    public ExecutionResult execute(String code, String language, String input) {
        if (code == null || code.trim().isEmpty()) {
            return new ExecutionResult(false, "No code provided to execute.", "Empty code", -1, 0L);
        }

        String lang = language == null ? "javascript" : language.trim().toLowerCase();

        SecurityCheckResult sec = checkSecurity(code, lang);
        if (!sec.isSafe) {
            return new ExecutionResult(false, "Security Restriction: " + sec.reason, sec.reason, -1, 0L);
        }

        return switch (lang) {
            case "python", "py" -> executePython(code, input);
            case "java" -> executeJava(code, input);
            case "javascript", "js", "node" -> executeJavaScript(code, input);
            case "c" -> executeC(code, input);
            case "cpp", "c++" -> executeCpp(code, input);
            default -> new ExecutionResult(false, "Unsupported language: " + language + ". Supported: python, java, javascript, c, cpp", "Unsupported language", -1, 0L);
        };
    }

    public ExecutionResult executePython(String code, String input) {
        Path tempDir = null;
        long startTime = System.currentTimeMillis();
        try {
            tempDir = Files.createTempDirectory("exec_py_");
            Path scriptFile = tempDir.resolve("script.py");
            Files.writeString(scriptFile, code, StandardCharsets.UTF_8);

            List<String> command = List.of(pythonCmd, "-u", "script.py");
            ProcessRunResult runResult = runProcess(command, tempDir, input, TIMEOUT_SECONDS);
            long elapsed = System.currentTimeMillis() - startTime;

            if (runResult.timedOut) {
                return new ExecutionResult(false, "Time Limit Exceeded (" + TIMEOUT_SECONDS + "s timeout).", "Timeout", -1, elapsed);
            }

            boolean success = (runResult.exitCode == 0);
            String output;
            if (success) {
                output = runResult.stdout.isEmpty() ? "Program executed successfully with no output." : runResult.stdout;
            } else {
                output = runResult.stderr.isEmpty() ? runResult.stdout : runResult.stderr;
            }

            return new ExecutionResult(success, output, runResult.stderr, runResult.exitCode, elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            logger.error("Error executing Python code: {}", e.getMessage(), e);
            return new ExecutionResult(false, "Execution error: " + e.getMessage(), e.getMessage(), -1, elapsed);
        } finally {
            cleanupDirectory(tempDir);
        }
    }

    public ExecutionResult executeJava(String code, String input) {
        Path tempDir = null;
        long startTime = System.currentTimeMillis();
        try {
            tempDir = Files.createTempDirectory("exec_java_");

            String className = "Solution";
            Matcher publicMatcher = Pattern.compile("public\\s+class\\s+([A-Za-z0-9_]+)").matcher(code);
            if (publicMatcher.find()) {
                className = publicMatcher.group(1);
            } else {
                Matcher classMatcher = Pattern.compile("class\\s+([A-Za-z0-9_]+)").matcher(code);
                if (classMatcher.find()) {
                    className = classMatcher.group(1);
                } else {
                    // Wrap bare code in a Solution class
                    code = "public class Solution {\n" +
                            "    public static void main(String[] args) {\n" +
                            "        " + code.replace("\n", "\n        ") + "\n" +
                            "    }\n" +
                            "}";
                }
            }

            Path javaFile = tempDir.resolve(className + ".java");
            Files.writeString(javaFile, code, StandardCharsets.UTF_8);

            // 1. Compile
            List<String> compileCmd = List.of(javacCmd, "-encoding", "UTF-8", className + ".java");
            ProcessRunResult compileResult = runProcess(compileCmd, tempDir, null, TIMEOUT_SECONDS);

            if (compileResult.timedOut) {
                long elapsed = System.currentTimeMillis() - startTime;
                return new ExecutionResult(false, "Compilation Timed Out.", "Compile Timeout", -1, elapsed);
            }

            if (compileResult.exitCode != 0) {
                long elapsed = System.currentTimeMillis() - startTime;
                String compileError = compileResult.stderr.isEmpty() ? compileResult.stdout : compileResult.stderr;
                return new ExecutionResult(false, "Compilation Error:\n" + compileError, compileError, compileResult.exitCode, elapsed);
            }

            // 2. Execute
            List<String> runCmd = List.of(javaCmd, "-Xmx128m", "-cp", ".", className);
            ProcessRunResult runResult = runProcess(runCmd, tempDir, input, TIMEOUT_SECONDS);
            long elapsed = System.currentTimeMillis() - startTime;

            if (runResult.timedOut) {
                return new ExecutionResult(false, "Time Limit Exceeded (" + TIMEOUT_SECONDS + "s timeout).", "Timeout", -1, elapsed);
            }

            boolean success = (runResult.exitCode == 0);
            String output;
            if (success) {
                output = runResult.stdout.isEmpty() ? "Program executed successfully with no output." : runResult.stdout;
            } else {
                output = runResult.stderr.isEmpty() ? runResult.stdout : runResult.stderr;
            }

            return new ExecutionResult(success, output, runResult.stderr, runResult.exitCode, elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            logger.error("Error executing Java code: {}", e.getMessage(), e);
            return new ExecutionResult(false, "Execution error: " + e.getMessage(), e.getMessage(), -1, elapsed);
        } finally {
            cleanupDirectory(tempDir);
        }
    }

    public ExecutionResult executeJavaScript(String code, String input) {
        Path tempDir = null;
        long startTime = System.currentTimeMillis();
        try {
            tempDir = Files.createTempDirectory("exec_js_");
            Path scriptFile = tempDir.resolve("script.js");
            Files.writeString(scriptFile, code, StandardCharsets.UTF_8);

            List<String> command = List.of(nodeCmd, "script.js");
            ProcessRunResult runResult = runProcess(command, tempDir, input, TIMEOUT_SECONDS);
            long elapsed = System.currentTimeMillis() - startTime;

            if (runResult.timedOut) {
                return new ExecutionResult(false, "Time Limit Exceeded (" + TIMEOUT_SECONDS + "s timeout).", "Timeout", -1, elapsed);
            }

            boolean success = (runResult.exitCode == 0);
            String output;
            if (success) {
                output = runResult.stdout.isEmpty() ? "Program executed successfully with no output." : runResult.stdout;
            } else {
                output = runResult.stderr.isEmpty() ? runResult.stdout : runResult.stderr;
            }

            return new ExecutionResult(success, output, runResult.stderr, runResult.exitCode, elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            logger.error("Error executing JavaScript code: {}", e.getMessage(), e);
            return new ExecutionResult(false, "Execution error: " + e.getMessage(), e.getMessage(), -1, elapsed);
        } finally {
            cleanupDirectory(tempDir);
        }
    }

    public ExecutionResult executeC(String code, String input) {
        Path tempDir = null;
        long startTime = System.currentTimeMillis();
        try {
            tempDir = Files.createTempDirectory("exec_c_");
            Path sourceFile = tempDir.resolve("program.c");
            Path exeFile = tempDir.resolve("program.exe");
            Files.writeString(sourceFile, code, StandardCharsets.UTF_8);

            // Compile
            List<String> compileCmd = List.of(gccCmd, "-O2", "program.c", "-o", "program.exe");
            ProcessRunResult compileResult = runProcess(compileCmd, tempDir, null, TIMEOUT_SECONDS);

            if (compileResult.timedOut) {
                long elapsed = System.currentTimeMillis() - startTime;
                return new ExecutionResult(false, "Compilation Timed Out.", "Compile Timeout", -1, elapsed);
            }

            if (compileResult.exitCode != 0) {
                long elapsed = System.currentTimeMillis() - startTime;
                String compileError = compileResult.stderr.isEmpty() ? compileResult.stdout : compileResult.stderr;
                return new ExecutionResult(false, "Compilation Error:\n" + compileError, compileError, compileResult.exitCode, elapsed);
            }

            // Run
            List<String> runCmd = List.of(exeFile.toAbsolutePath().toString());
            ProcessRunResult runResult = runProcess(runCmd, tempDir, input, TIMEOUT_SECONDS);
            long elapsed = System.currentTimeMillis() - startTime;

            if (runResult.timedOut) {
                return new ExecutionResult(false, "Time Limit Exceeded (" + TIMEOUT_SECONDS + "s timeout).", "Timeout", -1, elapsed);
            }

            boolean success = (runResult.exitCode == 0);
            String output = success
                    ? (runResult.stdout.isEmpty() ? "Program executed successfully with no output." : runResult.stdout)
                    : (runResult.stderr.isEmpty() ? runResult.stdout : runResult.stderr);

            return new ExecutionResult(success, output, runResult.stderr, runResult.exitCode, elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            logger.error("Error executing C code: {}", e.getMessage(), e);
            return new ExecutionResult(false, "Execution error: " + e.getMessage(), e.getMessage(), -1, elapsed);
        } finally {
            cleanupDirectory(tempDir);
        }
    }

    public ExecutionResult executeCpp(String code, String input) {
        Path tempDir = null;
        long startTime = System.currentTimeMillis();
        try {
            tempDir = Files.createTempDirectory("exec_cpp_");
            Path sourceFile = tempDir.resolve("program.cpp");
            Path exeFile = tempDir.resolve("program.exe");
            Files.writeString(sourceFile, code, StandardCharsets.UTF_8);

            // Compile
            List<String> compileCmd = List.of(gppCmd, "-O2", "program.cpp", "-o", "program.exe");
            ProcessRunResult compileResult = runProcess(compileCmd, tempDir, null, TIMEOUT_SECONDS);

            if (compileResult.timedOut) {
                long elapsed = System.currentTimeMillis() - startTime;
                return new ExecutionResult(false, "Compilation Timed Out.", "Compile Timeout", -1, elapsed);
            }

            if (compileResult.exitCode != 0) {
                long elapsed = System.currentTimeMillis() - startTime;
                String compileError = compileResult.stderr.isEmpty() ? compileResult.stdout : compileResult.stderr;
                return new ExecutionResult(false, "Compilation Error:\n" + compileError, compileError, compileResult.exitCode, elapsed);
            }

            // Run
            List<String> runCmd = List.of(exeFile.toAbsolutePath().toString());
            ProcessRunResult runResult = runProcess(runCmd, tempDir, input, TIMEOUT_SECONDS);
            long elapsed = System.currentTimeMillis() - startTime;

            if (runResult.timedOut) {
                return new ExecutionResult(false, "Time Limit Exceeded (" + TIMEOUT_SECONDS + "s timeout).", "Timeout", -1, elapsed);
            }

            boolean success = (runResult.exitCode == 0);
            String output = success
                    ? (runResult.stdout.isEmpty() ? "Program executed successfully with no output." : runResult.stdout)
                    : (runResult.stderr.isEmpty() ? runResult.stdout : runResult.stderr);

            return new ExecutionResult(success, output, runResult.stderr, runResult.exitCode, elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            logger.error("Error executing C++ code: {}", e.getMessage(), e);
            return new ExecutionResult(false, "Execution error: " + e.getMessage(), e.getMessage(), -1, elapsed);
        } finally {
            cleanupDirectory(tempDir);
        }
    }

    private static class ProcessRunResult {
        int exitCode;
        String stdout;
        String stderr;
        boolean timedOut;

        ProcessRunResult(int exitCode, String stdout, String stderr, boolean timedOut) {
            this.exitCode = exitCode;
            this.stdout = stdout;
            this.stderr = stderr;
            this.timedOut = timedOut;
        }
    }

    private ProcessRunResult runProcess(List<String> command, Path workDir, String input, long timeoutSeconds) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workDir.toFile());
        Map<String, String> env = pb.environment();
        env.put("PYTHONIOENCODING", "utf-8");
        env.put("LANG", "en_US.UTF-8");

        Process process = pb.start();

        StringBuilder stdoutBuilder = new StringBuilder();
        StringBuilder stderrBuilder = new StringBuilder();

        Thread stdoutThread = new Thread(() -> readStream(process.getInputStream(), stdoutBuilder));
        Thread stderrThread = new Thread(() -> readStream(process.getErrorStream(), stderrBuilder));
        stdoutThread.start();
        stderrThread.start();

        // Feed stdin if provided, then close stdin stream
        if (input != null && !input.isEmpty()) {
            try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8))) {
                writer.write(input);
                writer.newLine();
                writer.flush();
            } catch (IOException ignored) {
            }
        } else {
            try {
                process.getOutputStream().close();
            } catch (IOException ignored) {
            }
        }

        boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            stdoutThread.join(500);
            stderrThread.join(500);
            return new ProcessRunResult(-1, stdoutBuilder.toString().trim(), "Execution timed out after " + timeoutSeconds + " seconds.", true);
        }

        stdoutThread.join(1000);
        stderrThread.join(1000);

        return new ProcessRunResult(process.exitValue(), stdoutBuilder.toString().trim(), stderrBuilder.toString().trim(), false);
    }

    private void readStream(InputStream is, StringBuilder out) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            char[] buffer = new char[1024];
            int read;
            int totalBytes = 0;
            while ((read = reader.read(buffer)) != -1) {
                if (totalBytes < MAX_OUTPUT_BYTES) {
                    int canAppend = Math.min(read, MAX_OUTPUT_BYTES - totalBytes);
                    out.append(buffer, 0, canAppend);
                    totalBytes += canAppend;
                    if (totalBytes >= MAX_OUTPUT_BYTES) {
                        out.append("\n... [Output truncated after 64KB]");
                        break;
                    }
                }
            }
        } catch (IOException ignored) {
        }
    }

    private void cleanupDirectory(Path dir) {
        if (dir == null || !Files.exists(dir)) return;
        try {
            Files.walk(dir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (Exception ignored) {
                        }
                    });
        } catch (Exception ignored) {
        }
    }

    private String resolveJavaCmd() {
        String javaHome = System.getProperty("java.home");
        if (javaHome != null) {
            Path p = Path.of(javaHome, "bin", "java.exe");
            if (Files.exists(p)) return p.toAbsolutePath().toString();
            p = Path.of(javaHome, "bin", "java");
            if (Files.exists(p)) return p.toAbsolutePath().toString();
        }
        return "java";
    }

    private String resolveJavacCmd() {
        String javaHome = System.getProperty("java.home");
        if (javaHome != null) {
            Path p = Path.of(javaHome, "bin", "javac.exe");
            if (Files.exists(p)) return p.toAbsolutePath().toString();
            p = Path.of(javaHome, "bin", "javac");
            if (Files.exists(p)) return p.toAbsolutePath().toString();
        }
        return "javac";
    }

    private String resolvePythonCmd() {
        List<String> candidates = List.of(
                "python",
                "py",
                "C:\\Users\\HP\\AppData\\Local\\Programs\\Python\\Python313\\python.exe"
        );
        for (String c : candidates) {
            try {
                Process p = new ProcessBuilder(c, "--version").start();
                if (p.waitFor(2, TimeUnit.SECONDS) && p.exitValue() == 0) {
                    return c;
                }
            } catch (Exception ignored) {
            }
        }
        return "python";
    }

    private String resolveNodeCmd() {
        List<String> candidates = List.of(
                "node",
                "C:\\Program Files\\nodejs\\node.exe"
        );
        for (String c : candidates) {
            try {
                Process p = new ProcessBuilder(c, "--version").start();
                if (p.waitFor(2, TimeUnit.SECONDS) && p.exitValue() == 0) {
                    return c;
                }
            } catch (Exception ignored) {
            }
        }
        return "node";
    }

    private String resolveGccCmd() {
        List<String> candidates = List.of(
                "gcc",
                "C:\\MinGW\\bin\\gcc.exe"
        );
        for (String c : candidates) {
            try {
                Process p = new ProcessBuilder(c, "--version").start();
                if (p.waitFor(2, TimeUnit.SECONDS) && p.exitValue() == 0) {
                    return c;
                }
            } catch (Exception ignored) {
            }
        }
        return "gcc";
    }

    private String resolveGppCmd() {
        List<String> candidates = List.of(
                "g++",
                "C:\\MinGW\\bin\\g++.exe"
        );
        for (String c : candidates) {
            try {
                Process p = new ProcessBuilder(c, "--version").start();
                if (p.waitFor(2, TimeUnit.SECONDS) && p.exitValue() == 0) {
                    return c;
                }
            } catch (Exception ignored) {
            }
        }
        return "g++";
    }
}
