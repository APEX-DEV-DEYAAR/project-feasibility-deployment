import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PrintButtonProps {
  projectName: string;
}

export default function PrintButton({ projectName }: PrintButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const element = document.querySelector(".main-content") as HTMLElement;
      if (!element) {
        console.error("Element .main-content not found");
        alert("Content not found");
        setIsGenerating(false);
        return;
      }

      console.log("Starting PDF generation...");
      console.log("Element found:", element);
      console.log("Element dimensions:", element.scrollWidth, "x", element.scrollHeight);

      // Create a container for proper sizing
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "1200px";
      container.style.backgroundColor = "#FAF6ED";
      
      // Clone the element
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = "1200px";
      clone.style.margin = "0";
      clone.style.padding = "20px";
      clone.style.backgroundColor = "#FAF6ED";
      clone.style.boxSizing = "border-box";
      
      container.appendChild(clone);
      document.body.appendChild(container);
      
      console.log("Clone created and added to DOM");

      // Wait a moment for layout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture
      const canvas = await html2canvas(clone, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FAF6ED",
        logging: true,
        width: 1200,
        height: clone.scrollHeight,
      });

      console.log("Canvas created:", canvas.width, "x", canvas.height);

      // Remove container
      document.body.removeChild(container);

      // Create PDF
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log("PDF dimensions:", imgWidth, "x", imgHeight);

      // Add header
      pdf.setFillColor(61, 41, 20);
      pdf.rect(0, 0, pageWidth, 18, "F");
      pdf.setTextColor(245, 236, 217);
      pdf.setFontSize(16);
      pdf.text("DEYAAR", margin + 5, 12);
      pdf.setFontSize(10);
      pdf.text("PROJECT FEASIBILITY", margin + 55, 12);
      pdf.setFontSize(9);
      pdf.text(
        new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
        pageWidth - margin - 5,
        12,
        { align: "right" }
      );

      // Add image
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", margin, 22, imgWidth, Math.min(imgHeight, pageHeight - 32));

      // Footer
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text(
        `Deyaar Project Feasibility | ${projectName || "Untitled"} | Generated ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      );

      pdf.save(`${projectName || "Report"}_${new Date().toISOString().split("T")[0]}.pdf`);
      console.log("PDF saved successfully");
      
    } catch (error) {
      console.error("PDF Error:", error);
      console.error("Error stack:", (error as Error).stack);
      alert("PDF generation failed. Check browser console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      className="btn btn-ghost btn-icon"
      onClick={generatePDF}
      disabled={isGenerating}
      title={isGenerating ? "Generating..." : "Print PDF"}
    >
      {isGenerating ? "⏳" : "🖨️"}
    </button>
  );
}
