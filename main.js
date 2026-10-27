"use strict";

const cenas = [
  {
    imagem: "imgBoasVindas",
    arquivo: "./img/boasvindas.jpg",
    titulo: "Bem-vindo",
    descricao: "Campus Virtual Anhanguera Antônio Carlos",
    fala: "Bem-vindo ao Campus Virtual Anhanguera Antônio Carlos, em Belo Horizonte. Esta experiência foi desenvolvida para promover acessibilidade e inovação. Gire a cabeça para explorar o ambiente."
  },
  {
    imagem: "imgPortal",
    arquivo: "./img/Portal.jpeg",
    titulo: "Portal de Entrada",
    descricao: "Entrada principal da unidade",
    fala: "Você está no portal de entrada da unidade Anhanguera Antônio Carlos."
  },
  {
    imagem: "imgBiblioteca",
    arquivo: "./img/biblioteca.jpg",
    titulo: "Biblioteca",
    descricao: "Espaço para estudo e pesquisa",
    fala: "Biblioteca. Ambiente destinado à leitura, pesquisa e desenvolvimento do conhecimento."
  },
  {
    imagem: "imgLaboratorio",
    arquivo: "./img/laboratorio.png",
    titulo: "Laboratório de Química",
    descricao: "Um dos diversos laboratórios do campus",
    fala: "Este é o laboratório de química. O campus conta com vários tipos de laboratórios para apoiar a formação dos estudantes, incluindo laboratórios de informática e outros espaços voltados às atividades práticas."
  },
  {
    imagem: "imgSala",
    arquivo: "./img/sala.png",
    titulo: "Sala de Aula",
    descricao: "Aprendizagem e desenvolvimento",
    fala: "Sala de aula. Ambiente voltado ao ensino e à aprendizagem."
  },
  {
    imagem: "imgSecretaria",
    arquivo: "./img/Secretaria.jpeg",
    titulo: "Secretaria Acadêmica",
    descricao: "Atendimento ao estudante",
    fala: "Secretaria acadêmica. Atendimento e suporte aos estudantes."
  },
  {
    imagem: "imgCantina",
    arquivo: "./img/Cantina.jpeg",
    titulo: "Cantina",
    descricao: "Convivência e alimentação",
    fala: "Cantina. Espaço de integração, convivência e alimentação da comunidade acadêmica."
  },
  {
    imagem: "imgEncerramento",
    arquivo: "./img/encerramento.png",
    titulo: "Obrigado pela visita!",
    descricao: "A equipe agradece por acompanhar este tour pelo campus",
    fala: "Agradecemos por nos acompanhar neste tour pelo campus junto com a nossa equipe. Foi uma satisfação apresentar estes espaços para você. Obrigado pela visita e esperamos que esta experiência tenha sido inspiradora."
  }
];

const PAUSA_APOS_FALA = 4000;
const $ = (id) => document.getElementById(id);
const ceu = $("ceu");
const panoramaCanvas = $("panoramaCanvas");
const panoramaContext = panoramaCanvas.getContext("2d");
const LARGURA_MAXIMA_PANORAMA = 8192;
const startScreen = $("startScreen");
const startButton = $("startButton");
let indice = 0;
let timer = null;
let idFala = 0;
let wakeLock = null;
let experienciaIniciada = false;

function cancelarAvanco() {
  clearTimeout(timer);
  timer = null;
}

function atualizarTexto(id, texto) {
  $(id).setAttribute("value", texto);
}

function carregarPanorama(caminho) {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();

    imagem.onload = () => {
      const escala = Math.min(1, LARGURA_MAXIMA_PANORAMA / imagem.naturalWidth);
      const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
      const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));

      panoramaCanvas.width = largura;
      panoramaCanvas.height = altura;
      panoramaContext.clearRect(0, 0, largura, altura);
      panoramaContext.drawImage(imagem, 0, 0, largura, altura);

      // Cria a textura a partir do canvas, sem modificar o arquivo original.
      const mesh = ceu.getObject3D("mesh");
      if (!mesh || !mesh.material) {
        rejeitar(new Error("O panorama ainda não está pronto no A-Frame."));
        return;
      }

      const texturaAnterior = mesh.material.map;
      const textura = new THREE.CanvasTexture(panoramaCanvas);
      textura.needsUpdate = true;
      if (THREE.SRGBColorSpace) textura.colorSpace = THREE.SRGBColorSpace;
      mesh.material.map = textura;
      mesh.material.needsUpdate = true;
      if (texturaAnterior) texturaAnterior.dispose();
      resolver();
    };

    imagem.onerror = () => rejeitar(new Error(`Não foi possível carregar: ${caminho}`));
    imagem.src = caminho;
  });
}

async function manterTelaLigada() {
  try {
    if ("wakeLock" in navigator) {
      if (wakeLock) await wakeLock.release().catch(() => {});
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    }
  } catch (erro) {
    console.warn("Bloqueio de tela indisponível:", erro);
  }
}

function falar(texto, aoTerminar) {
  const meuId = ++idFala;
  if (!("speechSynthesis" in window)) {
    console.warn("Síntese de voz não suportada neste navegador.");
    aoTerminar();
    return;
  }
  window.speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 0.95;
  fala.pitch = 1;
  fala.volume = 1;
  const vozes = window.speechSynthesis.getVoices();
  const vozPortugues = vozes.find((voz) => /^pt-BR$/i.test(voz.lang)) || vozes.find((voz) => /^pt([-_])/i.test(voz.lang));
  if (vozPortugues) fala.voice = vozPortugues;
  let finalizada = false;
  function finalizar() {
    if (finalizada || meuId !== idFala) return;
    finalizada = true;
    aoTerminar();
  }
  fala.onend = finalizar;
  fala.onerror = (evento) => { console.warn("Erro na narração:", evento.error); finalizar(); };
  window.speechSynthesis.speak(fala);
}

function mostrarCena(novoIndice) {
  cancelarAvanco();
  idFala++;
  indice = Math.max(0, Math.min(novoIndice, cenas.length - 1));
  const cena = cenas[indice];
  atualizarTexto("titulo", cena.titulo);
  atualizarTexto("descricao", cena.descricao);
  atualizarTexto("progresso", `Cena ${indice + 1} de ${cenas.length}`);

  carregarPanorama(cena.arquivo).catch((erro) => {
    console.error("Erro ao trocar o panorama:", erro);
  });
  falar(cena.fala, () => {
    if (indice < cenas.length - 1) timer = setTimeout(() => mostrarCena(indice + 1), PAUSA_APOS_FALA);
  });
}

function navegar(direcao) { mostrarCena(indice + direcao); }

$("btnProximo").addEventListener("click", () => navegar(1));
$("btnAnterior").addEventListener("click", () => navegar(-1));
$("btnRepetir").addEventListener("click", () => mostrarCena(indice));

startButton.addEventListener("click", async () => {
  if (experienciaIniciada) return;
  experienciaIniciada = true;
  startButton.disabled = true;
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      const permissao = await DeviceOrientationEvent.requestPermission();
      if (permissao !== "granted") console.warn("Permissão de orientação não concedida.");
    }
  } catch (erro) { console.warn("Não foi possível solicitar orientação:", erro); }
  await manterTelaLigada();
  startScreen.style.display = "none";
  mostrarCena(0);
});

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && experienciaIniciada) await manterTelaLigada();
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => window.speechSynthesis.getVoices());
}

const toggleVR = $("toggleVR");
const exitVR = $("exitVR");
const stereoOverlay = $("stereoOverlay");
const leftEye = $("leftEye");
const rightEye = $("rightEye");
let stereoActive = false;
let stereoFrame = null;

function desenharTelaDividida() {
  if (!stereoActive) return;
  const scene = document.querySelector("a-scene");
  const source = scene && scene.canvas;
  if (source && source.width > 0 && source.height > 0) {
    [leftEye, rightEye].forEach((canvas) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      const context = canvas.getContext("2d");
      if (context && width > 0 && height > 0) context.drawImage(source, 0, 0, canvas.width, canvas.height);
    });
  }
  stereoFrame = requestAnimationFrame(desenharTelaDividida);
}

function entrarNoModoVR() {
  if (!experienciaIniciada) { alert("Toque primeiro em INICIAR EXPERIÊNCIA."); return; }
  stereoActive = true;
  document.body.classList.add("vr-active");
  if (stereoFrame !== null) cancelAnimationFrame(stereoFrame);
  desenharTelaDividida();
}

function sairDoModoVR() {
  stereoActive = false;
  document.body.classList.remove("vr-active");
  if (stereoFrame !== null) { cancelAnimationFrame(stereoFrame); stereoFrame = null; }
}

toggleVR.addEventListener("click", entrarNoModoVR);
exitVR.addEventListener("click", sairDoModoVR);
window.addEventListener("resize", () => { if (stereoActive) desenharTelaDividida(); });
