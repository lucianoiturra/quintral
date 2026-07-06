export interface EstudioFito {
  cita: string;
  descripcion: string;
  url: string;
}

export interface FichaCompuesto {
  id: string;
  nombre: string;
  queEs: string;
  funcionEnPlanta: string[];
  aplicacionesBiomedicas: string[];
  presenteEnQuintral: true;
  estudios: EstudioFito[];
}

const TORRES_2019 =
  "https://www.scielo.cl/article_plus.php?lng=es&pid=S0717-97072019000404645&tlng=en";
const SIMIRGIOTIS_2016 =
  "https://researchers.unab.cl/en/publications/phenolic-compounds-in-chilean-mistletoe-quintral-tristerix-tetran/";

export const BIBLIOTECA: FichaCompuesto[] = [
  {
    id: "polifenoles",
    nombre: "Polifenoles",
    queEs:
      "Los polifenoles son un amplio grupo de compuestos naturales producidos por las plantas. Se caracterizan por tener uno o más grupos fenólicos y participar en la defensa frente a factores ambientales.",
    funcionEnPlanta: [
      "Actúan como antioxidantes.",
      "Protegen frente a la radiación UV.",
      "Ayudan a defender la planta de hongos, bacterias e insectos.",
      "Participan en la respuesta al estrés ambiental.",
    ],
    aplicacionesBiomedicas: [
      "Antioxidante.",
      "Antiinflamatoria.",
      "Antimicrobiana.",
      "Cardioprotectora.",
      "Neuroprotectora.",
      "Anticancerígena.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion:
          "Determina el poder reductor y el perfil fitoquímico del quintral hospedado en maqui, huayún y álamo: fenoles totales, flavonoides totales, poder antioxidante y comparación entre hospederos.",
        url: TORRES_2019,
      },
      {
        cita: "Simirgiotis et al. (2016)",
        descripcion:
          "Usa UHPLC-Orbitrap-MS para identificar compuestos fenólicos en el muérdago chileno: ácido clorogénico, ácido feruloilquínico, quercetina, luteolina, apigenina, isoramnetina y otros.",
        url: SIMIRGIOTIS_2016,
      },
    ],
  },
  {
    id: "flavonoides",
    nombre: "Flavonoides",
    queEs:
      "Los flavonoides son un subgrupo de los polifenoles responsables de muchos de los colores presentes en flores, hojas y frutos.",
    funcionEnPlanta: [
      "Protegen frente a la radiación solar.",
      "Favorecen la polinización al aportar color a las flores.",
      "Actúan como antioxidantes.",
      "Participan en mecanismos de defensa frente a microorganismos.",
    ],
    aplicacionesBiomedicas: [
      "Antioxidante.",
      "Antiinflamatoria.",
      "Antivírica.",
      "Antibacteriana.",
      "Antidiabética.",
      "Protectora del sistema cardiovascular.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion: "Cuantifica flavonoides totales en hojas y flores.",
        url: TORRES_2019,
      },
      {
        cita: "Simirgiotis et al. (2016)",
        descripcion:
          "Identifica flavonoides específicos mediante espectrometría de masas.",
        url: SIMIRGIOTIS_2016,
      },
    ],
  },
  {
    id: "terpenoides",
    nombre: "Terpenoides",
    queEs:
      "Los terpenoides constituyen uno de los grupos más diversos de metabolitos secundarios de las plantas.",
    funcionEnPlanta: [
      "Forman parte de aceites esenciales y resinas.",
      "Protegen frente a insectos herbívoros.",
      "Ayudan a atraer polinizadores mediante aromas.",
      "Participan en la comunicación química entre plantas.",
    ],
    aplicacionesBiomedicas: [
      "Antimicrobiana.",
      "Antifúngica.",
      "Antiparasitaria.",
      "Antiinflamatoria.",
      "Antitumoral.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion:
          "Tamizaje fitoquímico cualitativo que confirma la presencia de terpenoides (no los cuantifica).",
        url: TORRES_2019,
      },
    ],
  },
  {
    id: "quinonas",
    nombre: "Quinonas",
    queEs:
      "Las quinonas son compuestos aromáticos presentes en numerosas especies vegetales.",
    funcionEnPlanta: [
      "Actúan como mecanismo de defensa química.",
      "Protegen frente a bacterias y hongos.",
      "Participan en procesos de oxidación y reducción.",
    ],
    aplicacionesBiomedicas: [
      "Antibacteriana.",
      "Antifúngica.",
      "Antivírica.",
      "Anticancerígena.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion: "Reporta presencia positiva mediante tamizaje fitoquímico.",
        url: TORRES_2019,
      },
    ],
  },
  {
    id: "esteroles",
    nombre: "Esteroles",
    queEs:
      "Los esteroles vegetales (fitosteroles) son lípidos estructurales presentes en las membranas celulares de las plantas.",
    funcionEnPlanta: [
      "Mantienen la estabilidad de las membranas celulares.",
      "Favorecen el crecimiento y desarrollo vegetal.",
      "Participan en procesos hormonales.",
    ],
    aplicacionesBiomedicas: [
      "Disminución del colesterol LDL.",
      "Salud cardiovascular.",
      "Actividad antiinflamatoria.",
      "Regulación del sistema inmunológico.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion:
          "Detecta esteroles en extractos del quintral mediante pruebas cualitativas.",
        url: TORRES_2019,
      },
    ],
  },
  {
    id: "glicosidos",
    nombre: "Glicósidos",
    queEs:
      "Los glicósidos son moléculas formadas por un azúcar unido a otro compuesto químico (aglicona). Existen distintos tipos, como los glicósidos cardíacos, fenólicos y flavonoides.",
    funcionEnPlanta: [
      "Defensa frente a herbívoros.",
      "Almacenamiento de compuestos activos.",
      "Participación en la respuesta al estrés.",
    ],
    aplicacionesBiomedicas: [
      "Cardiotónica.",
      "Antioxidante.",
      "Antiinflamatoria.",
      "Antimicrobiana.",
      "Anticancerígena.",
    ],
    presenteEnQuintral: true,
    estudios: [
      {
        cita: "Torres et al. (2019)",
        descripcion: "Identifica glicósidos durante el análisis fitoquímico.",
        url: TORRES_2019,
      },
    ],
  },
];
