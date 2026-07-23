package com.UnickaDigital.pdv.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Comparator;

/**
 * Backup do banco H2 usando o comando nativo "BACKUP TO" (gera um .zip
 * consistente mesmo com o sistema rodando).
 *
 * - Um backup automático a cada inicialização do sistema
 * - Um backup automático todo dia às 20h (se o sistema estiver aberto)
 * - Backup manual pelo botão no painel inicial (admin)
 * - Mantém os 30 backups mais recentes; os antigos são apagados
 */
@Service
public class BackupService {

    private static final int MAX_BACKUPS = 30;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final File pastaBackups =
            new File(System.getProperty("user.home"), "UnickaPDV/backups");

    public File fazerBackup() {
        pastaBackups.mkdirs();

        String nome = "backup-unicka-" +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmmss")) + ".zip";
        File destino = new File(pastaBackups, nome);

        String caminho = destino.getAbsolutePath().replace("'", "''");
        jdbcTemplate.execute("BACKUP TO '" + caminho + "'");

        limparBackupsAntigos();
        return destino;
    }

    public File[] listarBackups() {
        File[] arquivos = pastaBackups.listFiles((dir, nome) ->
                nome.startsWith("backup-unicka-") && nome.endsWith(".zip"));
        if (arquivos == null) return new File[0];
        Arrays.sort(arquivos, Comparator.comparing(File::getName).reversed());
        return arquivos;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void backupAoIniciar() {
        try {
            File f = fazerBackup();
            System.out.println("Backup automático de inicialização criado: " + f.getAbsolutePath());
        } catch (Exception e) {
            System.err.println("Falha no backup de inicialização: " + e.getMessage());
        }
    }

    @Scheduled(cron = "0 0 20 * * *") // todo dia às 20:00
    public void backupDiario() {
        try {
            File f = fazerBackup();
            System.out.println("Backup diário criado: " + f.getAbsolutePath());
        } catch (Exception e) {
            System.err.println("Falha no backup diário: " + e.getMessage());
        }
    }

    private void limparBackupsAntigos() {
        File[] arquivos = listarBackups(); // já vem do mais novo pro mais antigo
        for (int i = MAX_BACKUPS; i < arquivos.length; i++) {
            arquivos[i].delete();
        }
    }
}
