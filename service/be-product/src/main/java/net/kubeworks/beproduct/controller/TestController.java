package net.kubeworks.beproduct.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/test")
public class TestController {

    private static final Logger log = LoggerFactory.getLogger(TestController.class);

    @GetMapping("/error")
    public String error(){
        log.error("error", new RuntimeException("error stack"));
        throw new RuntimeException("error");
    }

    @GetMapping("/service")
    public String service(){

        log.info("this is service");

        return "this is service..";
    }

    @GetMapping("/http")
    public String http(){
        log.atInfo()
                .addKeyValue("log_category", "app")
                .addKeyValue("log_type", "http")
                .log("this is http.");
        return "this is http.";
    }

    @PostMapping("/http-body")
    public Map<String, Object> httpBody(@RequestBody Map<String, Object> body) {
        return Map.of(
                "received", body,
                "message", "ok"
        );
    }

}
