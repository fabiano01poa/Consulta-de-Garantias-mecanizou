export interface StockItem {
  idStock: string;
  cliente: string;
  descricao: string;
  codigo: string;
  marca: string;
  quantEstoque: string;
  fornecedor: string;
  novoFornecedorFilial: string;
  statusDevolucao: string;
  obsNotaFiscal: string;
  observacoesGerais: string;
  localidade?: string;
  dataRecebimento?: string;
  dataSaida?: string;
  protocolo?: string;
  valorUnitario?: string;
  valorTotal?: string;
  motivo?: string;
  dataSolicitacao?: string;
}

export interface FilterState {
  idStock: string;
  cliente: string;
  searchTerm: string;
}

export interface SheetFetchResult {
  success: boolean;
  source: 'google_sheets' | 'fallback_sample' | 'custom_csv';
  message?: string;
  totalRows: number;
  data: StockItem[];
  sheetId?: string;
  gid?: string;
}
