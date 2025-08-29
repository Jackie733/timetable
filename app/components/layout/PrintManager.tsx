export interface PrintManagerProps {
  onPrint: () => void;
}

export function usePrintManager(): PrintManagerProps {
  const handlePrint = () => {
    const printDate = new Date().toLocaleDateString("zh-CN");
    const printHeader = document.querySelector(".print-header");
    if (printHeader) {
      printHeader.setAttribute("data-print-date", printDate);
    }
    window.print();
  };

  return {
    onPrint: handlePrint,
  };
}
