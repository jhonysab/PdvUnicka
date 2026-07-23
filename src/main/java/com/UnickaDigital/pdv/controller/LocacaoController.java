package com.UnickaDigital.pdv.controller;

import com.UnickaDigital.pdv.model.Locacao;
import com.UnickaDigital.pdv.repository.LocacaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/locacoes")
@CrossOrigin(origins = "*")
public class LocacaoController {

    @Autowired
    private LocacaoRepository locacaoRepository;

    // GET /api/locacoes — lista todas
    @GetMapping
    public List<Locacao> listarTodas() {
        return locacaoRepository.findAll();
    }

    // GET /api/locacoes/proximas?dias=7 — locações com evento próximo
    @GetMapping("/proximas")
    public List<Locacao> listarProximas(@RequestParam(defaultValue = "7") int dias) {
        LocalDate hoje   = LocalDate.now();
        LocalDate limite = hoje.plusDays(dias);
        return locacaoRepository.buscarProximas(hoje, limite);
    }

    // GET /api/locacoes/status/{status}
    @GetMapping("/status/{status}")
    public List<Locacao> listarPorStatus(@PathVariable String status) {
        return locacaoRepository.findByStatusOrderByDataEventoAsc(status.toUpperCase());
    }

    // GET /api/locacoes/periodo?inicio=...&fim=...
    @GetMapping("/periodo")
    public List<Locacao> listarPorPeriodo(@RequestParam String inicio, @RequestParam String fim) {
        return locacaoRepository.buscarPorPeriodo(LocalDate.parse(inicio), LocalDate.parse(fim));
    }

    // POST /api/locacoes — cadastra ou atualiza
    @PostMapping
    public ResponseEntity<?> salvar(@RequestBody Locacao locacao) {
        if (locacao.getTema() == null || locacao.getTema().isBlank()) {
            return ResponseEntity.badRequest().body("Tema é obrigatório!");
        }
        if (locacao.getDataEvento() == null) {
            return ResponseEntity.badRequest().body("Data do evento é obrigatória!");
        }

        // Define status e data de cadastro para novas locações
        if (locacao.getId() == null) {
            locacao.setDataCadastro(LocalDateTime.now());
            if (locacao.getStatus() == null || locacao.getStatus().isBlank()) {
                locacao.setStatus("RESERVADO");
            }
        } else {
            // Preserva data de cadastro na edição
            locacaoRepository.findById(locacao.getId()).ifPresent(original ->
                    locacao.setDataCadastro(original.getDataCadastro())
            );
        }

        return ResponseEntity.ok(locacaoRepository.save(locacao));
    }

    // PATCH /api/locacoes/{id}/status?status=ENTREGUE
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> atualizarStatus(@PathVariable Long id, @RequestParam String status) {
        return locacaoRepository.findById(id)
                .map(locacao -> {
                    locacao.setStatus(status.toUpperCase());
                    return ResponseEntity.ok(locacaoRepository.save(locacao));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/locacoes/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluir(@PathVariable Long id) {
        if (!locacaoRepository.existsById(id)) return ResponseEntity.notFound().build();
        locacaoRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}