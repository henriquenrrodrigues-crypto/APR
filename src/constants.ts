export const COMMON_RISKS = [
  {
    description: "Queda de nível diferente",
    measures: ["Uso de cinto de segurança tipo paraquedista", "Instalação de linha de vida", "Isolamento da área inferior"],
    classification: "Alto" as const
  },
  {
    description: "Choque elétrico",
    measures: [
      "Desenergização do circuito", 
      "Uso de ferramentas isoladas", 
      "Uso de luvas isolantes", 
      "Sinalização de impedimento",
      "Aterramento Temporário",
      "Isolação de Partes Vivas",
      "Capacitação e Treinamento",
      "Sinalização",
      "Capacete de Classe B",
      "Vestimenta Antichama",
      "Botina de Segurança Dielétrica",
      "Óculos de Segurança e Protetor Facial"
    ],
    classification: "Alto" as const
  },
  {
    description: "Fisico",
    measures: [
      "Protetor auricular",
      "Luvas antivibração",
      "Pausas periódicas",
      "Hidratação",
      "Pausas",
      "Proteção solar",
      "Vestimenta adequada",
      "Vestimenta térmica",
      "Pausas em ambiente aquecido",
      "Máscara de solda",
      "Barreiras de proteção"
    ],
    classification: "Médio" as const
  },
  {
    description: "Projeção de partículas",
    measures: ["Uso de óculos de segurança", "Uso de protetor facial", "Instalação de biombos"],
    classification: "Médio" as const
  },
  {
    description: "Risco Ergonômico",
    measures: ["Levantamento de peso", "Movimentos repetitivos", "Posturas inadequadas"],
    classification: "Baixo" as const
  },
  {
    description: "Atropelamento",
    measures: ["Isolamento e sinalização da área", "Uso de colete refletivo", "Atenção redobrada à movimentação de máquinas"],
    classification: "Alto" as const
  },
  {
    description: "Riscos Biológicos",
    measures: [
      "Uso de luvas e máscaras descartáveis", 
      "Higienização constante das mãos", 
      "Descarte adequado de resíduos biológicos",
      "Ventilação adequada / exaustão", 
      "Treinamentos periódicos", 
      "Sinalização de risco biológico", 
      "Redução do tempo de exposição"
    ],
    classification: "Médio" as const
  },
  {
    description: "Riscos Químicos",
    measures: [
      "Uso de respiradores específicos", 
      "Uso de luvas nitrílicas", 
      "Consulta à FISPQ dos produtos", 
      "Ventilação adequada do local",
      "Óculos de segurança",
      "Redução do tempo de exposição",
      "Aventais de PVC, macacões impermeáveis ou vestimentas de proteção química",
      "Botas de PVC de cano longo com resistência a produtos químicos"
    ],
    classification: "Alto" as const
  },
  {
    description: "Riscos Psicossociais",
    measures: ["Pausas regulares", "Treinamento de gestão de estresse", "Canais de comunicação abertos", "Adequação da carga horária"],
    classification: "Baixo" as const
  }
];
