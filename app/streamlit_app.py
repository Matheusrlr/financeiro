"""Dashboard: finanças pessoais — faturas PDF + Gemini."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

# Ensure project root is on path when running: streamlit run app/streamlit_app.py
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.express as px
import streamlit as st

from src.config import ensure_data_dirs
from src.db.repository import get_repository
from src.services.analytics import monthly_totals_all_months, totals_for_month
from src.services.consulting import get_or_generate_insights
from src.services.pipeline import process_upload


def _brl(v: float) -> str:
    s = f"{v:,.2f}"
    return "R$ " + s.replace(",", "X").replace(".", ",").replace("X", ".")


st.set_page_config(
    page_title="Finanças — Faturas",
    page_icon="💳",
    layout="wide",
)

ensure_data_dirs()
repo = get_repository()


def _month_options() -> list[str]:
    months = repo.list_reference_months()
    today = date.today().strftime("%Y-%m")
    if today not in months:
        months = [today] + months
    return sorted(set(months), reverse=True)


def main() -> None:
    st.title("Dashboard de Finanças Pessoais")
    st.caption("Upload de faturas PDF, categorização e consultoria com Gemini.")

    months = _month_options()
    default_idx = 0

    with st.sidebar:
        st.subheader("Mês de visualização")
        if not months:
            sel_month = st.text_input("Mês (YYYY-MM)", value=date.today().strftime("%Y-%m"))
        else:
            sel_month = st.selectbox("Mês", options=months, index=default_idx)

        st.divider()
        st.subheader("Upload de fatura (PDF)")
        up_card = st.selectbox("Cartão", options=["Cartão A (card_a)", "Cartão B (card_b)"])
        card_code = "card_a" if up_card.startswith("Cartão A") else "card_b"
        ref_upload = st.text_input(
            "Mês de referência da fatura",
            value=sel_month,
            help="Formato YYYY-MM — período ao qual a fatura se refere.",
        )
        uploaded = st.file_uploader("Arquivo PDF", type=["pdf"])
        if st.button("Processar PDF", type="primary"):
            if uploaded is None:
                st.error("Selecione um arquivo PDF.")
            else:
                try:
                    data = uploaded.getvalue()
                    sid, bank, n = process_upload(
                        data,
                        uploaded.name,
                        card_code,
                        ref_upload.strip(),
                    )
                    st.success(
                        f"Processado: banco detectado `{bank}`, {n} transações (statement id {sid})."
                    )
                    st.rerun()
                except ValueError as e:
                    st.error(str(e))
                except Exception as e:
                    st.error(f"Erro: {e}")

    # --- Overview cards
    totals = totals_for_month(sel_month)
    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Gasto total (mês)", _brl(totals["total"]))
    with c2:
        st.metric("Total necessário", _brl(totals["necessario"]))
    with c3:
        st.metric("Total supérfluo", _brl(totals["superfluo"]))

    st.divider()

    # --- Charts
    col_a, col_b = st.columns(2)
    hist = monthly_totals_all_months()
    with col_a:
        st.subheader("Gasto total mês a mês")
        if hist:
            df_bar = pd.DataFrame(hist)
            fig_bar = px.bar(
                df_bar,
                x="reference_month",
                y="total",
                labels={"reference_month": "Mês", "total": "Total (R$)"},
            )
            fig_bar.update_layout(xaxis_tickangle=-45)
            st.plotly_chart(fig_bar, use_container_width=True)
        else:
            st.info("Sem dados ainda. Faça upload de uma fatura.")

    with col_b:
        st.subheader("Necessário vs supérfluo")
        if totals["total"] > 0:
            df_pie = pd.DataFrame(
                {
                    "categoria": ["Necessário", "Supérfluo"],
                    "valor": [totals["necessario"], totals["superfluo"]],
                }
            )
            fig_pie = px.pie(
                df_pie,
                names="categoria",
                values="valor",
                hole=0.35,
            )
            st.plotly_chart(fig_pie, use_container_width=True)
        else:
            st.info("Sem gastos neste mês.")

    st.divider()

    # --- Consulting (AI)
    st.subheader("Consultoria (IA)")
    cc1, cc2 = st.columns([3, 1])
    with cc2:
        refresh = st.button("Regenerar insights")
    with cc1:
        if totals["total"] <= 0:
            st.info("Carregue e processe faturas para este mês para habilitar a consultoria com IA.")
        else:
            try:
                insights = get_or_generate_insights(sel_month, force_refresh=refresh)
                st.markdown(f"**Resumo:** {insights.get('summary', '')}")
                st.markdown("**Variação mês a mês:**")
                for row in insights.get("month_over_month", []) or []:
                    st.write(
                        f"- **{row.get('metric', '')}** ({row.get('direction', '')}): {row.get('comment', '')}"
                    )
                st.markdown("**Possíveis vazamentos:**")
                for leak in insights.get("leaks", []) or []:
                    st.write(f"- {leak}")
                st.markdown("**Dicas:**")
                for tip in insights.get("tips", []) or []:
                    st.write(f"- {tip}")
            except Exception as e:
                st.warning(
                    "Não foi possível gerar a consultoria (verifique GEMINI_API_KEY ou dados do mês)."
                )
                st.caption(str(e))

    st.divider()

    # --- Transactions table
    st.subheader("Transações do mês")
    f1, f2 = st.columns(2)
    with f1:
        cat_filter = st.selectbox(
            "Categoria",
            options=["(todas)", "necessario", "superfluo"],
        )
    with f2:
        card_filter = st.selectbox(
            "Cartão",
            options=["(todos)", "card_a", "card_b"],
        )
    cat = None if cat_filter == "(todas)" else cat_filter
    cc = None if card_filter == "(todos)" else card_filter
    rows = repo.transactions_for_month(sel_month, card_code=cc, category=cat)
    if rows:
        df = pd.DataFrame(rows)
        display = df[
            ["txn_date", "description", "amount", "category", "card_label"]
        ].copy()
        display.columns = ["Data", "Descrição", "Valor", "Categoria", "Cartão"]
        st.dataframe(display, use_container_width=True, hide_index=True)
    else:
        st.info("Nenhuma transação para os filtros selecionados.")


main()
