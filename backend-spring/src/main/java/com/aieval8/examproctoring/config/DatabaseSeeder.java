package com.aieval8.examproctoring.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Startup runner - clean database mode.
 * No hardcoded, seeded or demo accounts, exams, questions, or dummy records are created on startup.
 */
@Component
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSeeder.class);

    @Override
    public void run(String... args) throws Exception {
        log.info("AI Exam Proctoring System started in clean mode. Ready for user registrations.");
    }
}
