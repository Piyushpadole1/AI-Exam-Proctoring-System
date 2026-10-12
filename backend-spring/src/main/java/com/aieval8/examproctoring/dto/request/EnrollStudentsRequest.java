package com.aieval8.examproctoring.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class EnrollStudentsRequest {

    @NotEmpty(message = "Student IDs list cannot be empty")
    private List<Long> studentIds;

    public EnrollStudentsRequest() {
    }

    public EnrollStudentsRequest(List<Long> studentIds) {
        this.studentIds = studentIds;
    }

    public List<Long> getStudentIds() {
        return studentIds;
    }

    public void setStudentIds(List<Long> studentIds) {
        this.studentIds = studentIds;
    }
}
