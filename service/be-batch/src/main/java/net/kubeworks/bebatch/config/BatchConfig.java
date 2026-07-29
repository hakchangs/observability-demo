package net.kubeworks.bebatch.config;

import org.springframework.batch.core.job.AbstractJob;
import org.springframework.batch.core.listener.JobExecutionListener;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BatchConfig {

    @Bean
    static BeanPostProcessor commonJobExecutionListenerInjector(JobExecutionListener commonJobExecutionListener) {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String name) {
                if (bean instanceof AbstractJob job) {
                    job.registerJobExecutionListener(commonJobExecutionListener);
                }
                return bean;
            }
        };
    }

}
