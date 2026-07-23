package com.UnickaDigital.pdv.controller;

import com.UnickaDigital.pdv.model.Cliente;
import com.UnickaDigital.pdv.repository.ClienteRepository;
import com.UnickaDigital.pdv.repository.LocacaoRepository;
import com.UnickaDigital.pdv.repository.VendaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/clientes")
@CrossOrigin(origins = "*")
public class ClienteController {

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private VendaRepository vendaRepository;

    @Autowired
    private LocacaoRepository locacaoRepository;

    // GET /api/clientes — lista todos (ou filtra por nome)
    @GetMapping
    public List<Cliente> listarTodos(@RequestParam(required = false) String nome) {
        if (nome != null && !nome.isBlank()) {
            return clienteRepository.findByNomeContainingIgnoreCase(nome);
        }
        return clienteRepository.findAll();
    }

    // GET /api/clientes/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Cliente> buscarPorId(@PathVariable Long id) {
        return clienteRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/clientes/cpf/{cpf}
    @GetMapping("/cpf/{cpf}")
    public ResponseEntity<Cliente> buscarPorCpf(@PathVariable String cpf) {
        return clienteRepository.findByCpf(cpf)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/clientes — cadastra ou atualiza
    @PostMapping
    public ResponseEntity<?> salvar(@RequestBody Cliente cliente) {
        // Validação básica
        if (cliente.getNome() == null || cliente.getNome().isBlank()) {
            return ResponseEntity.badRequest().body("Nome é obrigatório!");
        }

        // Se for novo, marca data de cadastro
        if (cliente.getId() == null) {
            cliente.setDataCadastro(LocalDateTime.now());
        } else {
            // Preserva a data de cadastro original na edição
            clienteRepository.findById(cliente.getId()).ifPresent(original ->
                    cliente.setDataCadastro(original.getDataCadastro())
            );
        }

        return ResponseEntity.ok(clienteRepository.save(cliente));
    }

    // DELETE /api/clientes/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluir(@PathVariable Long id) {
        if (!clienteRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        // Cliente com histórico não pode ser apagado (perderia o vínculo das vendas/locações)
        if (vendaRepository.existsByClienteId(id)) {
            return ResponseEntity.badRequest()
                    .body("Este cliente possui vendas registradas e não pode ser excluído.");
        }
        if (locacaoRepository.existsByClienteId(id)) {
            return ResponseEntity.badRequest()
                    .body("Este cliente possui locações registradas e não pode ser excluído.");
        }

        clienteRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}