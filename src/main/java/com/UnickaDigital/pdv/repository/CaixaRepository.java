package com.UnickaDigital.pdv.repository;

import com.UnickaDigital.pdv.model.Caixa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CaixaRepository extends JpaRepository<Caixa, Long> {

    Optional<Caixa> findByStatus(String status);

    @Query("SELECT c FROM Caixa c WHERE c.dataAbertura >= :inicio AND c.dataAbertura <= :fim ORDER BY c.dataAbertura")
    List<Caixa> buscarPorPeriodo(@Param("inicio") LocalDateTime inicio, @Param("fim") LocalDateTime fim);
    List<Caixa> findByStatusOrderByDataFechamentoDesc(String status);
}