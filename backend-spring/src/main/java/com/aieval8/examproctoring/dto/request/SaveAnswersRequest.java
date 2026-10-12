package com.aieval8.examproctoring.dto.request;

import java.util.Map;

public class SaveAnswersRequest {

    private Map<String, String> answers;

    public SaveAnswersRequest() {
    }

    public SaveAnswersRequest(Map<String, String> answers) {
        this.answers = answers;
    }

    public Map<String, String> getAnswers() {
        return answers;
    }

    public void setAnswers(Map<String, String> answers) {
        this.answers = answers;
    }
}
