package com.UnickaDigital.pdv.controller;

import com.UnickaDigital.pdv.model.Usuario;
import com.UnickaDigital.pdv.repository.UsuarioRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    // LOGIN — cria a sessão no servidor; o AuthFilter exige essa sessão nas demais rotas
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpSession session) {
        String username = body.get("username");
        String senha    = body.get("senha");

        Optional<Usuario> usuario = usuarioRepository.findByUsername(username);

        if (usuario.isEmpty() || !passwordEncoder.matches(senha, usuario.get().getSenha())) {
            return ResponseEntity.status(401).body("Usuário ou senha incorretos.");
        }

        session.setAttribute("username", usuario.get().getUsername());
        session.setAttribute("perfil",   usuario.get().getPerfil());

        // Retorna perfil e nome — o frontend salva na sessionStorage
        return ResponseEntity.ok(Map.of(
                "username", usuario.get().getUsername(),
                "perfil",   usuario.get().getPerfil()
        ));
    }

    // LOGOUT — encerra a sessão
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok().build();
    }

    private boolean naoEhAdmin(HttpSession session) {
        return !"ADMIN".equals(session.getAttribute("perfil"));
    }

    @PostMapping("/cadastrar")
    public ResponseEntity<?> cadastrar(@RequestBody Usuario novoUsuario, HttpSession session) {
        if (naoEhAdmin(session)) {
            return ResponseEntity.status(403).body("Apenas administradores podem cadastrar usuários.");
        }
        if (usuarioRepository.findByUsername(novoUsuario.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Nome de usuário já existe.");
        }

        if (novoUsuario.getPerfil() == null || novoUsuario.getPerfil().isBlank()) {
            novoUsuario.setPerfil("FUNCIONARIO");
        }

        novoUsuario.setSenha(passwordEncoder.encode(novoUsuario.getSenha()));
        return ResponseEntity.ok(usuarioRepository.save(novoUsuario));
    }

    // LISTAR USUÁRIOS (para o admin gerenciar)
    @GetMapping("/usuarios")
    public ResponseEntity<?> listarUsuarios(HttpSession session) {
        if (naoEhAdmin(session)) {
            return ResponseEntity.status(403).body("Apenas administradores podem listar usuários.");
        }
        return ResponseEntity.ok(usuarioRepository.findAll());
    }

    // DELETAR USUÁRIO
    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<?> deletarUsuario(@PathVariable Long id, HttpSession session) {
        if (naoEhAdmin(session)) {
            return ResponseEntity.status(403).body("Apenas administradores podem excluir usuários.");
        }

        Optional<Usuario> alvo = usuarioRepository.findById(id);
        if (alvo.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (alvo.get().getUsername().equals(session.getAttribute("username"))) {
            return ResponseEntity.badRequest().body("Você não pode excluir o próprio usuário.");
        }
        if ("ADMIN".equals(alvo.get().getPerfil()) && usuarioRepository.countByPerfil("ADMIN") <= 1) {
            return ResponseEntity.badRequest().body("Não é possível excluir o único administrador do sistema.");
        }

        usuarioRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // EDITAR USUÁRIO (perfil e/ou senha)
    @PutMapping("/usuarios/{id}")
    public ResponseEntity<?> editarUsuario(@PathVariable Long id,
                                           @RequestBody Map<String, String> dados,
                                           HttpSession session) {
        if (naoEhAdmin(session)) {
            return ResponseEntity.status(403).body("Apenas administradores podem editar usuários.");
        }

        Optional<Usuario> opt = usuarioRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Usuario usuario = opt.get();

        // Impede rebaixar o último administrador (o sistema ficaria sem admin)
        if (dados.containsKey("perfil") && !"ADMIN".equals(dados.get("perfil"))
                && "ADMIN".equals(usuario.getPerfil()) && usuarioRepository.countByPerfil("ADMIN") <= 1) {
            return ResponseEntity.badRequest().body("Não é possível rebaixar o único administrador do sistema.");
        }

        if (dados.containsKey("perfil")) {
            usuario.setPerfil(dados.get("perfil"));
        }
        if (dados.containsKey("senha") && !dados.get("senha").isBlank()) {
            usuario.setSenha(passwordEncoder.encode(dados.get("senha")));
        }
        usuarioRepository.save(usuario);
        return ResponseEntity.ok().build();
    }
}
