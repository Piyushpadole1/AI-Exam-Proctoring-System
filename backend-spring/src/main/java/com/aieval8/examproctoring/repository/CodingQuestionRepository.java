package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.CodingQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CodingQuestionRepository extends JpaRepository<CodingQuestion, Long> {
    Optional<CodingQuestion> findFirstByExamId(String examId);
    List<CodingQuestion> findByExamId(String examId);
    void deleteByExamId(String examId);
}
