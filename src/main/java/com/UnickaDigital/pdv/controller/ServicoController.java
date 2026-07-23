package com.UnickaDigital.pdv.controller;

import com.UnickaDigital.pdv.model.Caixa;
import com.UnickaDigital.pdv.model.Servico;
import com.UnickaDigital.pdv.repository.CaixaRepository;
import com.UnickaDigital.pdv.repository.ServicoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/servicos")
@CrossOrigin(origins = "*")
public class ServicoController {

    private static final Set<String> TIPOS_VALIDOS  = Set.of("JAE", "CELULAR", "CONTAS");
    private static final Set<String> FORMAS_VALIDAS = Set.of("DINHEIRO", "CREDITO", "DEBITO", "PIX");

    @Autowired private ServicoRepository servicoRepository;
    @Autowired private CaixaRepository   caixaRepository;

    // Serviços do turno atual (caixa aberto)
    @GetMapping("/turno")
    public ResponseEntity<?> listarDoTurno() {
        Optional<Caixa> aberto = caixaRepository.findByStatus("ABERTO");
        if (aberto.isEmpty()) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(servicoRepository.findByCaixaIdOrderByDataHoraDesc(aberto.get().getId()));
    }

    // Serviços de um caixa específico (para o histórico)
    @GetMapping("/caixa/{caixaId}")
    public List<Servico> listarPorCaixa(@PathVariable Long caixaId) {
        return servicoRepository.findByCaixaIdOrderByDataHoraDesc(caixaId);
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Servico servico) {

        Optional<Caixa> caixaAberto = caixaRepository.findByStatus("ABERTO");
        if (caixaAberto.isEmpty()) {
            return ResponseEntity.badRequest().body("Nenhum caixa aberto! Abra o caixa antes de registrar serviços.");
        }

        if (servico.getTipo() == null || !TIPOS_VALIDOS.contains(servico.getTipo())) {
            return ResponseEntity.badRequest().body("Tipo de serviço inválido!");
        }
        if (servico.getValor() <= 0) {
            return ResponseEntity.badRequest().body("Informe um valor válido!");
        }
        if (servico.getFormaPagamento() == null || !FORMAS_VALIDAS.contains(servico.getFormaPagamento())) {
            return ResponseEntity.badRequest().body("Forma de pagamento inválida!");
        }

        servico.setId(null);
        servico.setCaixaId(caixaAberto.get().getId());
        servico.setDataHora(LocalDateTime.now());
        return ResponseEntity.ok(servicoRepository.save(servico));
    }

    // Excluir só é permitido enquanto o caixa do serviço está aberto
    // (depois de fechado, os totais já foram gravados no fechamento)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluir(@PathVariable Long id) {
        Optional<Servico> opt = servicoRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Optional<Caixa> caixa = caixaRepository.findById(opt.get().getCaixaId());
        boolean caixaAindaAberto = caixa.isPresent() && "ABERTO".equals(caixa.get().getStatus());
        if (!caixaAindaAberto) {
            return ResponseEntity.badRequest().body("Não é possível excluir serviço de um caixa já fechado!");
        }

        servicoRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
