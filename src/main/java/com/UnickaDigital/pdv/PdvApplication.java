package com.UnickaDigital.pdv;

import com.UnickaDigital.pdv.model.Produto;
import com.UnickaDigital.pdv.model.Usuario;
import com.UnickaDigital.pdv.repository.ProdutoRepository;
import com.UnickaDigital.pdv.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootApplication
@EnableScheduling // habilita o backup automático diário
public class PdvApplication {

	public static void main(String[] args) {
		// Se o PDV já estiver rodando (clique duplo no atalho), só abre a tela
		if (portaOcupada(8080)) {
			abrirNavegador();
			return;
		}
		SpringApplication.run(PdvApplication.class, args);
	}

	private static boolean portaOcupada(int porta) {
		try (java.net.ServerSocket ignorada = new java.net.ServerSocket(porta)) {
			return false;
		} catch (java.io.IOException e) {
			return true;
		}
	}

	private static void abrirNavegador() {
		try {
			if (System.getProperty("os.name", "").toLowerCase().contains("win")) {
				Runtime.getRuntime().exec(new String[]{
						"rundll32", "url.dll,FileProtocolHandler", "http://localhost:8080"
				});
			}
		} catch (Exception e) {
			// Sem interface gráfica (ex: rodando como serviço) — segue sem abrir
		}
	}

	@Bean
	CommandLineRunner abrirTelaAoIniciar() {
		return args -> abrirNavegador();
	}

	@Bean
	public BCryptPasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	CommandLineRunner inicializarDados(UsuarioRepository usuarioRepository,
	                                   ProdutoRepository produtoRepository,
	                                   BCryptPasswordEncoder encoder) {
		return args -> {

			if (usuarioRepository.count() == 0) {
				Usuario admin = new Usuario();
				admin.setUsername("admin");
				admin.setSenha(encoder.encode("admin123"));
				admin.setPerfil("ADMIN");
				usuarioRepository.save(admin);

				System.out.println("======================================");
				System.out.println("ADMIN PADRÃO CRIADO COM SUCESSO");
				System.out.println("Usuário: admin  |  Senha: admin123");
				System.out.println("======================================");
			}

			// Garante que existe um produto "VENDA AVULSA" para itens sem cadastro
			if (produtoRepository.findByNome("VENDA AVULSA").isEmpty()) {
				Produto avulso = new Produto();
				avulso.setNome("VENDA AVULSA");
				avulso.setPreco(0.0);
				avulso.setEstoque(999999);
				produtoRepository.save(avulso);
				System.out.println("Produto VENDA AVULSA criado automaticamente.");
			}
		};
	}
}
