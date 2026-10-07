// Endereço da API.
// - Página aberta pelo backend (http://localhost:5000 ou link do túnel no celular):
//   a API está no mesmo endereço, então usa a origem atual.
// - Página aberta pelo Live Server (porta 5500/5501) ou direto do arquivo:
//   a API continua em http://localhost:5000.
const servedByLiveServer = ["5500", "5501"].includes(window.location.port);
const servedFromFile = window.location.protocol === "file:";

const API_URL = servedByLiveServer || servedFromFile
    ? "http://localhost:5000/api"
    : `${window.location.origin}/api`;

export default API_URL;
