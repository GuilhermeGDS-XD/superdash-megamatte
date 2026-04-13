"use client";

import { LayoutDashboard, BarChart3, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function LoadingDashboard({ description }: { description?: string } = {}) {
    const text = description ?? 'Coletando métricas atualizadas, processando gráficos e preparando a inteligência da sua campanha...';
    return (
        <div className="min-h-screen bg-[#F8F9FE] flex flex-col items-center justify-center p-8 ml-0 lg:ml-64">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden"
            >
                {/* Efeito de brilho no fundo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative w-24 h-24 mb-8">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LayoutDashboard className="w-8 h-8 text-blue-500 animate-pulse" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
                        Carregando Dashboard
                    </h2>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        {text}
                    </p>

                    <div className="w-full flex justify-between px-4 pb-2 border-b border-slate-100 mb-6 relative overflow-hidden">
                        <motion.div
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="absolute bottom-[-1px] left-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500 w-1/2"
                        />
                    </div>

                    <div className="flex justify-center gap-6 text-slate-400">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}>
                            <BarChart3 className="w-5 h-5" />
                        </motion.div>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}>
                            <TrendingUp className="w-5 h-5" />
                        </motion.div>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}>
                            <Users className="w-5 h-5" />
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
