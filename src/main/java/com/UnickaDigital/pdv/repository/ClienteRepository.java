package com.UnickaDigital.pdv.repository;

import com.UnickaDigital.pdv.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    // Busca por nome (parcial, ignorando maiúsculas)
    List<Cliente> findByNomeContainingIgnoreCase(String nome);

    // Busca por CPF exato
    Optional<Cliente> findByCpf(String cpf);
}