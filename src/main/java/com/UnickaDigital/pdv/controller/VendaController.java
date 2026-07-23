package com.UnickaDigital.pdv.controller;

import com.UnickaDigital.pdv.dto.VendaRequest;
import com.UnickaDigital.pdv.model.Caixa;
import com.UnickaDigital.pdv.model.ItemVenda;
import com.UnickaDigital.pdv.model.Produto;
import com.UnickaDigital.pdv.model.Sangria;
import com.UnickaDigital.pdv.model.Venda;
import com.UnickaDigital.pdv.repository.CaixaRepository;
import com.UnickaDigital.pdv.repository.ProdutoRepository;
import com.UnickaDigital.pdv.repository.SangriaRepository;
import com.UnickaDigital.pdv.repository.ServicoRepository;
import com.UnickaDigital.pdv.repository.VendaRepository;
import com.UnickaDigital.pdv.dto.ProdutoMaisVendidoDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/vendas")
@CrossOrigin(origins = "*")
public class VendaController {

    private static final String NOME_PRODUTO_AVULSO = "VENDA AVULSA";

    @Autowired private VendaRepository    vendaRepository;
    @Autowired private ProdutoRepository  produtoRepository;
    @Autowired private SangriaRepository  sangriaRepository;
    @Autowired private CaixaRepository    caixaRepository;
    @Autowired private ServicoRepository  servicoRepository;

    // =========================================================================
    // VENDAS
    // =========================================================================

    @GetMapping
    public List<Venda> listarTodas() {
        return vendaRepository.findAll();
    }

    @GetMapping("/relatorio-produtos")
    public List<ProdutoMaisVendidoDTO> obterProdutosMaisVendidos() {
        return vendaRepository.obterProdutosMaisVendidos();
    }

    @GetMapping("/relatorio-produtos-periodo")
    public List<ProdutoMaisVendidoDTO> obterProdutosMaisVendidosPorPeriodo(
            @RequestParam String inicio, @RequestParam String fim) {
        LocalDateTime dataInicio = LocalDate.parse(inicio).atStartOfDay();
        LocalDateTime dataFim    = LocalDate.parse(fim).atTime(23, 59, 59);
        return vendaRepository.obterProdutosMaisVendidosPorPeriodo(dataInicio, dataFim);
    }

    @GetMapping("/periodo")
    public List<Venda> listarPorPeriodo(@RequestParam String inicio, @RequestParam String fim) {
        LocalDateTime dataInicio = LocalDate.parse(inicio).atStartOfDay();
        LocalDateTime dataFim    = LocalDate.parse(fim).atTime(23, 59, 59);
        return vendaRepository.buscarVendasPorPeriodo(dataInicio, dataFim);
    }

    @GetMapping("/cliente/{clienteId}")
    public List<Venda> buscarPorCliente(@PathVariable Long clienteId) {
        return vendaRepository.findByClienteIdOrderByDataHoraDesc(clienteId);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> realizarVenda(@RequestBody VendaRequest request) {

        if (request.getItens() == null || request.getItens().isEmpty()) {
            return ResponseEntity.badRequest().body("A venda precisa ter pelo menos um item!");
        }

        Optional<Caixa> caixaAberto = caixaRepository.findByStatus("ABERTO");
        if (caixaAberto.isEmpty()) {
            return ResponseEntity.badRequest().body("Nenhum caixa aberto! Abra o caixa antes de registrar vendas.");
        }

        // 1ª etapa: valida todos os itens ANTES de mexer no estoque.
        // Assim nenhum estoque é baixado se qualquer item da venda for inválido.
        // Também soma o subtotal previsto para validar o desconto.
        double subtotalPrevisto = 0.0;

        for (ItemVenda item : request.getItens()) {

            if (item.getQuantidade() == null || item.getQuantidade() <= 0) {
                return ResponseEntity.badRequest().body("Quantidade inválida em um dos itens da venda!");
            }

            if (item.getProduto() != null && item.getProduto().getId() != null) {
                Optional<Produto> produto = produtoRepository.findById(item.getProduto().getId());
                if (produto.isEmpty()) {
                    return ResponseEntity.badRequest().body(
                            "Produto não encontrado! ID: " + item.getProduto().getId());
                }
                if (produto.get().getEstoque() < item.getQuantidade()) {
                    return ResponseEntity.badRequest().body(
                            "Estoque insuficiente para: " + produto.get().getNome() +
                                    " (disponível: " + produto.get().getEstoque() + ")");
                }
                subtotalPrevisto += produto.get().getPreco() * item.getQuantidade();

            } else {
                Optional<Produto> avulso = produtoRepository.findByNome(NOME_PRODUTO_AVULSO);
                if (avulso.isEmpty()) {
                    return ResponseEntity.badRequest().body(
                            "Produto VENDA AVULSA não encontrado! Reinicie o servidor para criá-lo automaticamente.");
                }
                double precoAvulso = item.getPrecoUnitario() != null
                        ? item.getPrecoUnitario()
                        : avulso.get().getPreco();
                subtotalPrevisto += precoAvulso * item.getQuantidade();
            }
        }

        // Valida o desconto contra o subtotal (ainda sem tocar no estoque)
        double desconto = request.getDesconto() != null ? request.getDesconto() : 0.0;
        if (desconto < 0) {
            return ResponseEntity.badRequest().body("Desconto não pode ser negativo!");
        }
        if (desconto > subtotalPrevisto + 0.001) {
            return ResponseEntity.badRequest().body(String.format(
                    "Desconto (R$ %.2f) maior que o total da venda (R$ %.2f)!", desconto, subtotalPrevisto));
        }

        // 2ª etapa: baixa o estoque e monta a venda.
        // Se algo inesperado falhar aqui, o @Transactional desfaz tudo (estoque incluso).
        Venda novaVenda = new Venda();
        novaVenda.setDataHora(LocalDateTime.now());
        novaVenda.setFormaPagamento(
                request.getFormaPagamento() != null ? request.getFormaPagamento() : "DINHEIRO"
        );
        novaVenda.setClienteId(request.getClienteId());
        novaVenda.setCaixaId(caixaAberto.get().getId());

        double valorTotal = 0.0;

        for (ItemVenda item : request.getItens()) {

            if (item.getProduto() == null || item.getProduto().getId() == null) {
                Produto produtoAvulso = produtoRepository.findByNome(NOME_PRODUTO_AVULSO).get();

                double precoAvulso = item.getPrecoUnitario() != null
                        ? item.getPrecoUnitario()
                        : produtoAvulso.getPreco();

                item.setProduto(produtoAvulso);
                item.setPrecoUnitario(precoAvulso);

            } else {
                Produto produtoDoBanco = produtoRepository.findById(item.getProduto().getId()).get();

                produtoDoBanco.setEstoque(produtoDoBanco.getEstoque() - item.getQuantidade());
                produtoRepository.save(produtoDoBanco);

                item.setProduto(produtoDoBanco);
                item.setPrecoUnitario(produtoDoBanco.getPreco());
            }

            valorTotal += item.getPrecoUnitario() * item.getQuantidade();
            item.setVenda(novaVenda);
        }

        novaVenda.setItens(request.getItens());
        novaVenda.setDesconto(desconto);
        // Valor final = soma dos itens - desconto (arredondado a centavos)
        novaVenda.setValorTotal(Math.round(Math.max(valorTotal - desconto, 0) * 100.0) / 100.0);
        return ResponseEntity.ok(vendaRepository.save(novaVenda));
    }

    // =========================================================================
    // SANGRIAS
    // =========================================================================

    @GetMapping("/sangrias")
    public List<Sangria> listarSangrias() {
        return sangriaRepository.findAll();
    }

    @PostMapping("/sangrias")
    public ResponseEntity<?> registrarSangria(@RequestBody Sangria sangria) {

        Optional<Caixa> caixaAberto = caixaRepository.findByStatus("ABERTO");
        if (caixaAberto.isEmpty()) {
            return ResponseEntity.badRequest().body("Nenhum caixa aberto! Abra o caixa antes de movimentar dinheiro.");
        }

        if (sangria.getValor() == null || sangria.getValor() <= 0) {
            return ResponseEntity.badRequest().body("Informe um valor válido!");
        }

        // Tipo padrão é SANGRIA (retirada); SUPRIMENTO é entrada de dinheiro
        String tipo = "SUPRIMENTO".equals(sangria.getTipo()) ? "SUPRIMENTO" : "SANGRIA";
        sangria.setTipo(tipo);

        // Sangria não pode retirar mais do que existe na gaveta
        if (tipo.equals("SANGRIA")) {
            Caixa caixa = caixaAberto.get();
            LocalDateTime abertura = caixa.getDataAbertura();
            LocalDateTime agora    = LocalDateTime.now();

            double dinheiroVendas = vendaRepository.buscarVendasPorPeriodo(abertura, agora).stream()
                    .filter(v -> v.getFormaPagamento() == null || "DINHEIRO".equals(v.getFormaPagamento()))
                    .mapToDouble(Venda::getValorTotal)
                    .sum();

            double sangrias = 0, suprimentos = 0;
            for (Sangria s : sangriaRepository.buscarPorPeriodo(abertura, agora)) {
                if ("SUPRIMENTO".equals(s.getTipo())) suprimentos += s.getValor();
                else                                  sangrias    += s.getValor();
            }

            // Serviços de passagem pagos em dinheiro também estão na gaveta
            double servicosDinheiro = servicoRepository.findByCaixaIdOrderByDataHoraDesc(caixa.getId()).stream()
                    .filter(s -> "DINHEIRO".equals(s.getFormaPagamento()))
                    .mapToDouble(com.UnickaDigital.pdv.model.Servico::getValor)
                    .sum();

            double disponivel = caixa.getValorInicial() + dinheiroVendas + suprimentos - sangrias + servicosDinheiro;
            if (sangria.getValor() > disponivel) {
                return ResponseEntity.badRequest().body(
                        String.format("Valor maior que o dinheiro disponível na gaveta (R$ %.2f)!", disponivel));
            }
        }

        sangria.setCaixa(caixaAberto.get());
        sangria.setDataHora(LocalDateTime.now());
        return ResponseEntity.ok(sangriaRepository.save(sangria));
    }
}
