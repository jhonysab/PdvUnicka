package com.UnickaDigital.pdv.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Devolve os dados da loja que aparecem no cabecalho do cupom de venda.
 *
 * Os valores reais NAO ficam no codigo: vem do arquivo "unicka-local.properties",
 * que esta fora do Git (ver .gitignore). Se o arquivo nao existir, entram os
 * valores genericos definidos abaixo e o sistema funciona normalmente.
 */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${loja.nome:UNICKA DIGITAL}")
    private String nome;

    @Value("${loja.cnpj:}")
    private String cnpj;

    @Value("${loja.endereco:}")
    private String endereco;

    // GET /api/config/loja
    @GetMapping("/loja")
    public Map<String, String> dadosDaLoja() {
        return Map.of(
                "nome",     nome,
                "cnpj",     cnpj,
                "endereco", endereco
        );
    }
}
