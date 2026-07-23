package com.UnickaDigital.pdv.repository;

import com.UnickaDigital.pdv.model.Servico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findByCaixaIdOrderByDataHoraDesc(Long caixaId);
}
