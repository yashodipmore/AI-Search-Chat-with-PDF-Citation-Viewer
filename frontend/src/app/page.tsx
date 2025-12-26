"use client";

import { ChatInterface } from "@/components/chat/chat-interface";
import { PDFViewer } from "@/components/pdf/pdf-viewer";
import { Header } from "@/components/layout/header";
import { useChatStore } from "@/store/chat-store";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { selectedCitation } = useChatStore();
  const showPdfViewer = selectedCitation !== null;

  return (
    <main className="flex flex-col h-screen">
      <Header />
      
      <div className={`flex-1 overflow-hidden split-view-container ${showPdfViewer ? 'with-pdf' : ''}`}>
        {/* Chat Interface - hidden on mobile when PDF is open */}
        <div className={`h-full overflow-hidden ${showPdfViewer ? 'hidden lg:block' : ''}`}>
          <ChatInterface />
        </div>

        {/* PDF Viewer - full screen on mobile, split on desktop */}
        <AnimatePresence mode="wait">
          {showPdfViewer && (
            <motion.div
              key="pdf-viewer"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.4 
              }}
              className="h-full w-full lg:w-auto border-l-0 lg:border-l border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 overflow-hidden absolute lg:relative inset-0 lg:inset-auto z-50 lg:z-auto"
            >
              <PDFViewer />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
