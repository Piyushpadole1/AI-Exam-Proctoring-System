package com.aieval8.examproctoring.controller;

import com.aieval8.examproctoring.service.CodeExecutionService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:*"}, allowCredentials = "true")
public class CodeExecutionController {

    private final CodeExecutionService codeExecutionService;

    public CodeExecutionController(CodeExecutionService codeExecutionService) {
        this.codeExecutionService = codeExecutionService;
    }

    @PostMapping(value = "/run-python", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> runPython(@RequestBody(required = false) Map<String, Object> body) {
        String code = extractCode(body);
        String input = extractInput(body);
        CodeExecutionService.ExecutionResult result = codeExecutionService.executePython(code, input);
        return ResponseEntity.ok(result.getOutput());
    }

    @PostMapping(value = "/run-java", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> runJava(@RequestBody(required = false) Map<String, Object> body) {
        String code = extractCode(body);
        String input = extractInput(body);
        CodeExecutionService.ExecutionResult result = codeExecutionService.executeJava(code, input);
        return ResponseEntity.ok(result.getOutput());
    }

    @PostMapping(value = "/run-javascript", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> runJavaScript(@RequestBody(required = false) Map<String, Object> body) {
        String code = extractCode(body);
        String input = extractInput(body);
        CodeExecutionService.ExecutionResult result = codeExecutionService.executeJavaScript(code, input);
        return ResponseEntity.ok(result.getOutput());
    }

    @PostMapping(value = "/run-c", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> runC(@RequestBody(required = false) Map<String, Object> body) {
        String code = extractCode(body);
        String input = extractInput(body);
        CodeExecutionService.ExecutionResult result = codeExecutionService.executeC(code, input);
        return ResponseEntity.ok(result.getOutput());
    }

    @PostMapping(value = "/run-cpp", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> runCpp(@RequestBody(required = false) Map<String, Object> body) {
        String code = extractCode(body);
        String input = extractInput(body);
        CodeExecutionService.ExecutionResult result = codeExecutionService.executeCpp(code, input);
        return ResponseEntity.ok(result.getOutput());
    }

    @PostMapping(value = {"/api/coding/run", "/api/compile"})
    public ResponseEntity<Map<String, Object>> runCodeStructured(@RequestBody(required = false) Map<String, Object> body) {
        String code = extractCode(body);
        String language = body != null && body.containsKey("language") ? String.valueOf(body.get("language")) : "javascript";
        String input = extractInput(body);

        CodeExecutionService.ExecutionResult result = codeExecutionService.execute(code, language, input);

        Map<String, Object> response = new HashMap<>();
        response.put("success", result.isSuccess());
        response.put("output", result.getOutput());
        response.put("error", result.getError());
        response.put("exitCode", result.getExitCode());
        response.put("executionTimeMs", result.getExecutionTimeMs());

        return ResponseEntity.ok(response);
    }

    private String extractCode(Map<String, Object> body) {
        if (body == null) return "";
        Object codeObj = body.get("code");
        return codeObj != null ? codeObj.toString() : "";
    }

    private String extractInput(Map<String, Object> body) {
        if (body == null) return null;
        Object inputObj = body.get("input");
        return inputObj != null ? inputObj.toString() : null;
    }
}
