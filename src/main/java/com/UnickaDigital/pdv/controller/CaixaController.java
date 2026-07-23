package com.UnickaDigital.pdv.controller;

import com.UnickaDigital.pdv.model.Caixa;
import com.UnickaDigital.pdv.model.Sangria;
import com.UnickaDigital.pdv.model.Servico;
import com.UnickaDigital.pdv.model.Venda;
import com.UnickaDigital.pdv.repository.CaixaRepository;
import com.UnickaDigital.pdv.repository.SangriaRepository;
import com.UnickaDigital.pdv.repository.ServicoRepository;
import com.UnickaDigital.pdv.repository.VendaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/caixa")
@CrossOrigin(origins = "*")
public class CaixaController {

    @Autowired private CaixaRepository   caixaRepository;
    @Autowired private VendaRepository   vendaRepository;
    @Autowired private SangriaRepository sangriaRepository;
    @Autowired private ServicoRepository servicoRepository;

    // Totais dos serviços de passagem registrados num turno.
    // dinheiro = entrou na gaveta; cartaoPix = consta na máquina mas não entrou.
    private static class TotaisServicos {
        double jae, celular, contas, dinheiro, cartaoPix;
        double total() { return jae + celular + contas; }
    }

    private TotaisServicos somarServicos(Long caixaId) {
        TotaisServicos t = new TotaisServicos();
        for (Servico s : servicoRepository.findByCaixaIdOrderByDataHoraDesc(caixaId)) {
            switch (s.getTipo()) {
                case "JAE"     -> t.jae     += s.getValor();
                case "CELULAR" -> t.celular += s.getValor();
                case "CONTAS"  -> t.contas  += s.getValor();
            }
            if ("DINHEIRO".equals(s.getFormaPagamento())) t.dinheiro  += s.getValor();
            else                                          t.cartaoPix += s.getValor();
        }
        return t;
    }

    // =========================================================================
    // CONSULTAR CAIXA ATUAL
    // =========================================================================

    @GetMapping("/atual")
    public ResponseEntity<Caixa> caixaAtual() {
        Optional<Caixa> aberto = caixaRepository.findByStatus("ABERTO");
        return aberto.map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    // =========================================================================
    // ABRIR CAIXA
    // =========================================================================

    @PostMapping("/abrir")
    public ResponseEntity<?> abrirCaixa(@RequestBody Map<String, Object> body) {

        // Impede abrir se já houver um caixa aberto
        if (caixaRepository.findByStatus("ABERTO").isPresent()) {
            return ResponseEntity.badRequest().body("Já existe um caixa aberto!");
        }

        Caixa novo = new Caixa();
        novo.setOperador(body.getOrDefault("operador", "Operador").toString());
        novo.setValorInicial(Double.parseDouble(body.getOrDefault("valorInicial", 0).toString()));
        novo.setDataAbertura(LocalDateTime.now());
        novo.setStatus("ABERTO");

        return ResponseEntity.ok(caixaRepository.save(novo));
    }

    // =========================================================================
    // FECHAR CAIXA
    // =========================================================================

    @PostMapping("/fechar")
    public ResponseEntity<?> fecharCaixa(@RequestBody Map<String, Object> body) {

        Optional<Caixa> aberto = caixaRepository.findByStatus("ABERTO");
        if (aberto.isEmpty()) {
            return ResponseEntity.badRequest().body("Nenhum caixa aberto para fechar!");
        }

        Caixa caixa = aberto.get();
        caixa.setValorContado(Double.parseDouble(body.getOrDefault("valorContado", 0).toString()));

        // Serviços de passagem: somados dos registros feitos durante o turno
        // e gravados nos mesmos campos de antes — histórico e PDFs não mudam.
        TotaisServicos serv = somarServicos(caixa.getId());
        caixa.setTotalRecargas(serv.total());
        caixa.setRecargasJae(serv.jae);
        caixa.setRecargasCelular(serv.celular);
        caixa.setRecargasContas(serv.contas);
        caixa.setRecargasCartao(serv.cartaoPix);
        caixa.setDataFechamento(LocalDateTime.now());
        caixa.setStatus("FECHADO");

        // Grava o total de sangrias/suprimentos do turno no caixa,
        // para os relatórios não precisarem recalcular depois
        double sangrias = 0, suprimentos = 0;
        for (Sangria s : sangriaRepository.buscarPorPeriodo(caixa.getDataAbertura(), caixa.getDataFechamento())) {
            if ("SUPRIMENTO".equals(s.getTipo())) suprimentos += s.getValor();
            else                                  sangrias    += s.getValor();
        }
        caixa.setTotalSangrias(sangrias);
        caixa.setTotalSuprimentos(suprimentos);

        return ResponseEntity.ok(caixaRepository.save(caixa));
    }

    // =========================================================================
    // RESUMO DO CAIXA ABERTO (cálculos para fechamento)
    // =========================================================================

    @GetMapping("/resumo")
    public ResponseEntity<?> resumoCaixa() {

        Optional<Caixa> aberto = caixaRepository.findByStatus("ABERTO");
        if (aberto.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        Caixa caixa = aberto.get();
        LocalDateTime inicio = caixa.getDataAbertura();
        LocalDateTime agora  = LocalDateTime.now();

        // Busca vendas e sangrias do período do caixa
        List<Venda>   vendas   = vendaRepository.buscarVendasPorPeriodo(inicio, agora);
        List<Sangria> sangrias = sangriaRepository.buscarPorPeriodo(inicio, agora);

        double totalDinheiro = 0;
        double totalCredito  = 0;
        double totalDebito   = 0;
        double totalPix      = 0;

        for (Venda v : vendas) {
            String forma = v.getFormaPagamento() != null ? v.getFormaPagamento() : "DINHEIRO";
            switch (forma) {
                case "DINHEIRO" -> totalDinheiro += v.getValorTotal();
                case "CREDITO"  -> totalCredito  += v.getValorTotal();
                case "DEBITO"   -> totalDebito   += v.getValorTotal();
                case "PIX"      -> totalPix      += v.getValorTotal();
            }
        }

        double totalSangrias    = 0;
        double totalSuprimentos = 0;
        for (Sangria s : sangrias) {
            if ("SUPRIMENTO".equals(s.getTipo())) totalSuprimentos += s.getValor();
            else                                  totalSangrias    += s.getValor();
        }
        double totalVendas = totalDinheiro + totalCredito + totalDebito + totalPix;

        // Serviços de passagem registrados durante o turno
        TotaisServicos serv = somarServicos(caixa.getId());

        // Dinheiro esperado na gaveta:
        // valor inicial + vendas em dinheiro + suprimentos - sangrias + serviços pagos em dinheiro
        double dinheiroEsperado = caixa.getValorInicial() + totalDinheiro + totalSuprimentos - totalSangrias
                + serv.dinheiro;

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("totalServicos",    serv.total());
        resumo.put("servicosJae",      serv.jae);
        resumo.put("servicosCelular",  serv.celular);
        resumo.put("servicosContas",   serv.contas);
        resumo.put("servicosDinheiro", serv.dinheiro);
        resumo.put("servicosCartao",   serv.cartaoPix);
        resumo.put("caixaId",          caixa.getId());
        resumo.put("operador",         caixa.getOperador());
        resumo.put("dataAbertura",     caixa.getDataAbertura());
        resumo.put("valorInicial",     caixa.getValorInicial());
        resumo.put("totalVendas",      totalVendas);
        resumo.put("qtdVendas",        vendas.size());
        resumo.put("totalDinheiro",    totalDinheiro);
        resumo.put("totalCredito",     totalCredito);
        resumo.put("totalDebito",      totalDebito);
        resumo.put("totalPix",         totalPix);
        resumo.put("totalCartao",      totalCredito + totalDebito);
        resumo.put("totalSangrias",    totalSangrias);
        resumo.put("totalSuprimentos", totalSuprimentos);
        resumo.put("dinheiroEsperado", dinheiroEsperado);

        return ResponseEntity.ok(resumo);
    }

    // =========================================================================
    // LISTAR CAIXAS POR PERÍODO (para relatório por turnos)
    // =========================================================================

    @GetMapping("/periodo")
    public List<Caixa> listarPorPeriodo(@RequestParam String inicio, @RequestParam String fim) {
        LocalDateTime dataInicio = java.time.LocalDate.parse(inicio).atStartOfDay();
        LocalDateTime dataFim    = java.time.LocalDate.parse(fim).atTime(23, 59, 59);
        return caixaRepository.buscarPorPeriodo(dataInicio, dataFim);
    }

    // =========================================================================
    // RESUMO DE UM CAIXA ESPECÍFICO (aberto ou fechado)
    // =========================================================================

    @GetMapping("/{id}/resumo")
    public ResponseEntity<?> resumoCaixaPorId(@PathVariable Long id) {
        Optional<Caixa> opt = caixaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Caixa caixa = opt.get();
        LocalDateTime inicio = caixa.getDataAbertura();
        LocalDateTime fim    = caixa.getDataFechamento() != null ? caixa.getDataFechamento() : LocalDateTime.now();

        List<Venda>   vendas   = vendaRepository.buscarVendasPorPeriodo(inicio, fim);
        List<Sangria> sangrias = sangriaRepository.buscarPorPeriodo(inicio, fim);

        double totalDinheiro = 0, totalCredito = 0, totalDebito = 0, totalPix = 0;
        for (Venda v : vendas) {
            String forma = v.getFormaPagamento() != null ? v.getFormaPagamento() : "DINHEIRO";
            switch (forma) {
                case "DINHEIRO" -> totalDinheiro += v.getValorTotal();
                case "CREDITO"  -> totalCredito  += v.getValorTotal();
                case "DEBITO"   -> totalDebito   += v.getValorTotal();
                case "PIX"      -> totalPix      += v.getValorTotal();
            }
        }

        double totalSangrias    = 0;
        double totalSuprimentos = 0;
        for (Sangria s : sangrias) {
            if ("SUPRIMENTO".equals(s.getTipo())) totalSuprimentos += s.getValor();
            else                                  totalSangrias    += s.getValor();
        }
        double totalVendas = totalDinheiro + totalCredito + totalDebito + totalPix;

        Map<String, Object> resumo = new HashMap<>();
        resumo.put("caixaId",          caixa.getId());
        resumo.put("operador",         caixa.getOperador());
        resumo.put("status",           caixa.getStatus());
        resumo.put("dataAbertura",     caixa.getDataAbertura());
        resumo.put("dataFechamento",   caixa.getDataFechamento());
        resumo.put("valorInicial",     caixa.getValorInicial());
        resumo.put("valorContado",     caixa.getValorContado());

        // Caixa fechado: usa os totais gravados no fechamento (histórico imutável).
        // Caixa ainda aberto: soma ao vivo dos serviços registrados no turno.
        if ("ABERTO".equals(caixa.getStatus())) {
            TotaisServicos serv = somarServicos(caixa.getId());
            resumo.put("totalRecargas",   serv.total());
            resumo.put("recargasJae",     serv.jae);
            resumo.put("recargasCelular", serv.celular);
            resumo.put("recargasContas",  serv.contas);
            resumo.put("recargasCartao",  serv.cartaoPix);
        } else {
            resumo.put("totalRecargas",   caixa.getTotalRecargas());
            resumo.put("recargasJae",     caixa.getRecargasJae());
            resumo.put("recargasCelular", caixa.getRecargasCelular());
            resumo.put("recargasContas",  caixa.getRecargasContas());
            resumo.put("recargasCartao",  caixa.getRecargasCartao() != null ? caixa.getRecargasCartao() : 0.0);
        }
        resumo.put("totalVendas",      totalVendas);
        resumo.put("qtdVendas",        vendas.size());
        resumo.put("totalDinheiro",    totalDinheiro);
        resumo.put("totalCredito",     totalCredito);
        resumo.put("totalDebito",      totalDebito);
        resumo.put("totalPix",         totalPix);
        resumo.put("totalCartao",      totalCredito + totalDebito);
        resumo.put("totalSangrias",    totalSangrias);
        resumo.put("totalSuprimentos", totalSuprimentos);

        return ResponseEntity.ok(resumo);
    }

    @GetMapping("/fechados")
    public List<Caixa> listarFechados() {
        return caixaRepository.findByStatusOrderByDataFechamentoDesc("FECHADO");
    }
}