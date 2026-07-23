package com.UnickaDigital.pdv.repository;

import com.UnickaDigital.pdv.model.Sangria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SangriaRepository extends JpaRepository<Sangria, Long> {

    @Query("SELECT s FROM Sangria s WHERE s.dataHora BETWEEN :inicio AND :fim ORDER BY s.dataHora DESC")
    List<Sangria> buscarPorPeriodo(LocalDateTime inicio, LocalDateTime fim);
}