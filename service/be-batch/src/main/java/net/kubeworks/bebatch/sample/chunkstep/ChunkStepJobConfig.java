package net.kubeworks.bebatch.sample.chunkstep;

import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.Step;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.infrastructure.item.ItemProcessor;
import org.springframework.batch.infrastructure.item.database.builder.JdbcCursorItemReaderBuilder;
import org.springframework.batch.infrastructure.item.support.ListItemReader;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Configuration
public class ChunkStepJobConfig {

    private final Logger log = LoggerFactory.getLogger(ChunkStepJobConfig.class);

    private final DataSource dataSource;
    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;

    public ChunkStepJobConfig(DataSource dataSource, JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        this.dataSource = dataSource;
        this.jobRepository = jobRepository;
        this.transactionManager = transactionManager;
    }

    @Bean
    public Job chunkStepJob() {
        return new JobBuilder("chunkStepJob", jobRepository)
                .start(simpleChunkStep())
                .next(jdbcChunkStep())
                .build();
    }

    @Bean
    public Step simpleChunkStep() {
        return new StepBuilder("simpleChunkStep", jobRepository)
                .<Integer, String> chunk(10)
                .transactionManager(transactionManager)
                .reader(new ListItemReader<>(IntStream.rangeClosed(1, 25).boxed().toList()))
                .processor(new ItemProcessor<>() {
                    @Override
                    public @Nullable String process(Integer item) {
                        return "item-" + item;
                    }
                })
                .writer(chunk -> log.info("[WRITE] size={} items={}", chunk.size(), chunk.getItems()))
                .build();
    }

    @Bean
    public Step jdbcChunkStep() {

        String sql = IntStream.rangeClosed(1, 25)
                .mapToObj(i -> "SELECT " + i + " AS n")
                .collect(Collectors.joining(" UNION ALL "));

        return new StepBuilder("jdbcChunkStep", jobRepository)
                .<Integer, String>chunk(10)
                .transactionManager(transactionManager)
                .reader(new JdbcCursorItemReaderBuilder<Integer>()
                        .name("cursorProbeReader")
                        .dataSource(dataSource)
                        .sql(sql)
                        .rowMapper((rs, rowNum) -> rs.getInt("n"))
                        .build()
                )
                .processor(new ItemProcessor<>() {
                    @Override
                    public @Nullable String process(Integer item) {
                        return "item-" + item;
                    }
                })
                .writer(chunk -> log.info("[WRITE] size={} items={}", chunk.size(), chunk.getItems()))
                .build();
    }

}
