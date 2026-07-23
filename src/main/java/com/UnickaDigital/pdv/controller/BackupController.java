package com.UnickaDigital.pdv.controller;

import com.UnickaDigital.pdv.service.BackupService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backup")
@CrossOrigin(origins = "*")
public class BackupController {

    @Autowired
    private BackupService backupService;

    private boolean naoEhAdmin(HttpSession session) {
        return !"ADMIN".equals(session.getAttribute("perfil"));
    }

    // POST /api/backup — gera um backup agora (admin)
    @PostMapping
    public ResponseEntity<?> fazerBackup(HttpSession session) {
        if (naoEhAdmin(session)) {
            return ResponseEntity.status(403).body("Apenas administradores podem gerar backups.");
        }
        try {
            File backup = backupService.fazerBackup();
            return ResponseEntity.ok(Map.of(
                    "arquivo", backup.getName(),
                    "pasta",   backup.getParent(),
                    "tamanhoKb", backup.length() / 1024
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Falha ao gerar backup: " + e.getMessage());
        }
    }

    // GET /api/backup — lista os backups existentes (admin)
    @GetMapping
    public ResponseEntity<?> listarBackups(HttpSession session) {
        if (naoEhAdmin(session)) {
            return ResponseEntity.status(403).body("Apenas administradores podem listar backups.");
        }
        List<Map<String, Object>> lista = new ArrayList<>();
        for (File f : backupService.listarBackups()) {
            lista.add(Map.of(
                    "arquivo",   f.getName(),
                    "tamanhoKb", f.length() / 1024,
                    "data",      Instant.ofEpochMilli(f.lastModified())
                                     .atZone(ZoneId.systemDefault()).toLocalDateTime().toString()
            ));
        }
        return ResponseEntity.ok(lista);
    }
}
