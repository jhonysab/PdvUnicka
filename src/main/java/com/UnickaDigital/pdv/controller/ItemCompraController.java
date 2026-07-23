package com.UnickaDigital.pdv.controller;

import com.UnickaDigital.pdv.model.ItemCompra;
import com.UnickaDigital.pdv.repository.ItemCompraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/compras")
@CrossOrigin(origins = "*")
public class ItemCompraController {

    @Autowired
    private ItemCompraRepository itemCompraRepository;

    @GetMapping
    public List<ItemCompra> listarTodos() {
        return itemCompraRepository.findAllByOrderByDataCriacaoDesc();
    }

    @PostMapping
    public ResponseEntity<?> salvar(@RequestBody ItemCompra item) {
        if (item.getNome() == null || item.getNome().isBlank()) {
            return ResponseEntity.badRequest().body("Nome do produto é obrigatório!");
        }
        if (item.getQuantidade() == null || item.getQuantidade() <= 0) {
            item.setQuantidade(1);
        }
        item.setId(null);
        item.setStatus("PENDENTE");
        item.setDataCriacao(LocalDateTime.now());
        return ResponseEntity.ok(itemCompraRepository.save(item));
    }

    // Alterna PENDENTE <-> COMPRADO (o checkbox da tela)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> alternarStatus(@PathVariable Long id) {
        return itemCompraRepository.findById(id)
                .map(item -> {
                    item.setStatus("COMPRADO".equals(item.getStatus()) ? "PENDENTE" : "COMPRADO");
                    return ResponseEntity.ok(itemCompraRepository.save(item));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluir(@PathVariable Long id) {
        if (!itemCompraRepository.existsById(id)) return ResponseEntity.notFound().build();
        itemCompraRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
