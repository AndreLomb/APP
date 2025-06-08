from escavador import CriterioOrdenacao, Ordem, config
from escavador.v2 import Processo
from flask import Flask, request, jsonify, render_template
import time
import os
import pandas as pd
import fitz

app = Flask(__name__, template_folder='Template', static_folder='Static')

# Configure sua chave de API do Escavador
config("IeyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNWVhYTcwYzc0MjYxNDBlZmI5MTQ2ZThlMjg2NDZlZDQzNzZmOGVmZjZhZjgwYTFlNmU5YWFjMjVhOWM0NDBjNDdjNDc1NWFhN2VkY2JhZDYiLCJpYXQiOjE3MzE3NzU0NDQuNDE3NzYyLCJuYmYiOjE3MzE3NzU0NDQuNDE3NzYzLCJleHAiOjIwNDczMDgyNDQuNDE1ODQxLCJzdWIiOiIyMDk2NzgyIiwic2NvcGVzIjpbImFjZXNzYXJfYXBpX3BhZ2EiXX0.qqz3MyDG_3opdd5ZeawVR6yQzysucN7aubQRQjG2c1v-2GrSFaIEwtxP_FqfTv6AEuHB9nmMAO7zp5MAKqiGrVkSXkiQ3kMd3xsnz5uU2ZgdYOcyLFwvQ-ESKAZ1n2_Bm8iAV_gvoTTBviYI1JE3AsqK-mRhJQ5viUEs523aYmw7C9NqpBbGa4s0k9WoRFtc8vYSNh4-ezw89GYyus53BHPyJ25KxnL3cPgAvlIuPR6MpGqKT_miPq_nbzCwP2cZBVR-GpAw712KmzHjS5zm-rpAyxdL7kDt7A74uhdBg-7roWnpc6bszgoTYJATQbE-Ak5VfY8HApMqwTyzgCe-N7Pedl2B-6nk0RW0MgFcnN7ptjn1Sl_l0SQTIMYhw5vnIxzjphdLx2XxKtRdcgIdrDTsIKBG-VI6ZkDmEC7LBtTHPkeRUYVzBx8HGZhpCxRegYnbGZyqy-TR_bXgHElU3TTzCI63H9_cz5sBDARSuOjWoBSMELyRxejwkxO0-JYUjSvVY0iuftDsz86sZyfmiy7v_oCGhrXIKBl8bVnBfg_rbTrWFwAcn2BIjaIUL-aECAG_8rfjz5sN1Sz2SngT8GumyyjBJ1IT6mTBQB8TQG-Eip-maSKb8p_-Vpfxbg2fg2Kkk7uXlCCtl1WHm_s_HGC6HsvPBdBYnxMufjLxz7I")

# Caminho para os arquivos CSV dos candidatos
pasta_csv = r"C:\Users\andre\OneDrive\Área de Trabalho\Programação\HTML\Static\consulta_cand_2022_BRASIL.csv"

df_final = pd.read_csv(pasta_csv, encoding='latin1', delimiter=';')

# Verificar se o nome está presente
def nome_presente_nos_csv(nome):
    return nome in df_final['NM_URNA_CANDIDATO'].values

# Buscar foto
def encontrar_foto(nome):
    foto_path = f"Static/img/{nome}.jpg"
    return foto_path if os.path.exists(foto_path) else "static/images/default.jpg"


# Buscar partido
def buscar_partido(nome):
    candidato = df_final[df_final['NM_URNA_CANDIDATO'] == nome]
    return candidato['NM_PARTIDO'].values[0] if not candidato.empty else "Partido não encontrado"

# Controle de requisições
request_tracker = {}
MAX_REQUESTS = 5
TIME_WINDOW = 60 * 60

def is_rate_limited(ip):
    current_time = time.time()
    requests = request_tracker.get(ip, [])
    requests = [req_time for req_time in requests if current_time - req_time < TIME_WINDOW]
    request_tracker[ip] = requests
    if len(requests) >= MAX_REQUESTS:
        return True
    requests.append(current_time)
    return False

# Buscar proposta
def pegar_proposta(nome):
    try:
        doc = fitz.open(rf'Static/proposta/{nome}.pdf')
        texto = ""
        for pagina in doc:
            texto += pagina.get_text()
        doc.close()
        return texto.strip()
    except:
        return "Proposta não disponível"

# Consultar processos
def consultar_processos(nome):
    if not nome_presente_nos_csv(nome):
        return {"erro": "Nome não encontrado nos registros locais. Verifique os arquivos CSV."}
    try:
        _, processos = Processo.por_nome(nome=nome, ordena_por=CriterioOrdenacao.INICIO, ordem=Ordem.DESC)
        dados_processos = []
        if processos:
            for processo in processos:
                processo_data = {
                    "numero_cnj": processo.numero_cnj,
                    "fonte": processo.fontes[0].nome if processo.fontes else 'Fonte não disponível',
                    "data_inicio": processo.data_inicio
                }
                movimentacoes = Processo.movimentacoes(numero_cnj=processo.numero_cnj)
                if movimentacoes:
                    processo_data["ultima_movimentacao"] = movimentacoes[0].conteudo
                dados_processos.append(processo_data)
        return dados_processos
    except Exception as e:
        print(f"Erro: {e}")
        return {"erro": "Erro interno ao consultar os processos"}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/perfil.html')
def perfil():
    return render_template('perfil.html')

# Endpoint da API
@app.route('/govbuster', methods=['GET'])
def govbuster():
    ip = request.remote_addr
    if is_rate_limited(ip):
        return jsonify({"erro": "Limite de requisições excedido. Tente novamente mais tarde."}), 429

    nome = request.args.get('nome')
    if not nome:
        return jsonify({"erro": "Nome do candidato não fornecido"}), 400

    nome = nome.upper()
    partido = buscar_partido(nome)
    processos = consultar_processos(nome)
    foto_caminho = encontrar_foto(nome)
    proposta = pegar_proposta(nome)

    if processos is None:
        return jsonify({"erro": "Erro ao consultar os processos"}), 500
    elif not processos:
        return jsonify({"mensagem": "Nenhum processo encontrado para o nome fornecido"}), 404
    else:
        return jsonify({
            "partido": partido,
            "processos": processos,
            "foto_url": foto_caminho,
            "proposta": proposta
        }), 200

# Nova rota para retornar os dados dos candidatos em JSON
@app.route('/dados-candidatos')
def dados_candidatos():
    return df_final.to_json(orient='records', force_ascii=False)

if __name__ == '__main__':
    app.run(debug=True)

@app.route('/detalhes-candidato/<nome>')
def detalhes_candidato(nome):
    nome = nome.upper()
    foto = f"/Static/img/{nome}.jpg"
    proposta_url = f"/Static/proposta/{nome}.pdf"
    return jsonify({
        "foto": foto,
        "proposta": proposta_url
    })
