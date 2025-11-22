import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from 'npm:jszip@3.10.1';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "npm:docx@8.5.0";
import { jsPDF } from "npm:jspdf@2.5.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { proposalIds, format, templateId, options = {} } = await req.json();

    if (!proposalIds || proposalIds.length === 0 || !format) {
      return Response.json({ 
        error: 'Missing required parameters: proposalIds, format' 
      }, { status: 400 });
    }

    // Fetch all proposals
    const proposals = await base44.asServiceRole.entities.Proposal.filter({
      id: { $in: proposalIds }
    });

    if (proposals.length === 0) {
      return Response.json({ error: 'No proposals found' }, { status: 404 });
    }

    // Create ZIP archive
    const zip = new JSZip();
    const exportRecords = [];

    // Process each proposal
    for (const proposal of proposals) {
      try {
        // Fetch sections
        const sections = await base44.asServiceRole.entities.ProposalSection.filter({
          proposal_id: proposal.id
        }, 'order');

        // Determine watermark based on status
        const approvedStatuses = ['approved', 'submitted', 'won', 'client_accepted'];
        const shouldWatermark = !approvedStatuses.includes(proposal.status);

        // Generate document
        let fileBlob, fileName;
        
        if (format === 'docx') {
          const result = await generateDOCX(proposal, sections, shouldWatermark, options);
          fileBlob = result.blob;
          fileName = result.fileName;
        } else if (format === 'pdf') {
          const result = await generatePDF(proposal, sections, shouldWatermark, options);
          fileBlob = result.blob;
          fileName = result.fileName;
        } else {
          continue; // Skip invalid format
        }

        // Add to ZIP
        zip.file(fileName, fileBlob);

        // Upload to private storage
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
          file: fileBlob
        });

        // Generate signed URL (valid for 7 days)
        const expiresIn = 7 * 24 * 60 * 60;
        const signedUrlResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
          file_uri: uploadResult.file_uri,
          expires_in: expiresIn
        });

        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);

        // Create export history record
        const exportRecord = await base44.asServiceRole.entities.ExportHistory.create({
          proposal_id: proposal.id,
          organization_id: proposal.organization_id,
          exported_by_email: user.email,
          exported_by_name: user.full_name,
          export_format: format,
          has_watermark: shouldWatermark,
          proposal_status_at_export: proposal.status,
          template_id: templateId || null,
          sections_exported: sections.map(s => s.id),
          file_name: fileName,
          file_size_bytes: fileBlob.size,
          file_uri: uploadResult.file_uri,
          download_url: signedUrlResult.signed_url,
          expires_at: expiryDate.toISOString(),
          options: JSON.stringify(options)
        });

        exportRecords.push(exportRecord);

      } catch (error) {
        console.error(`Error processing proposal ${proposal.id}:`, error);
        // Continue with other proposals
      }
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Upload ZIP to storage
    const zipFileName = `batch_export_${Date.now()}.zip`;
    const zipUploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: zipBlob
    });

    // Generate signed URL for ZIP
    const zipSignedUrlResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: zipUploadResult.file_uri,
      expires_in: 7 * 24 * 60 * 60
    });

    return Response.json({
      success: true,
      total_proposals: proposals.length,
      exports_created: exportRecords.length,
      zip_file_name: zipFileName,
      zip_download_url: zipSignedUrlResult.signed_url,
      zip_file_size_bytes: zipBlob.size,
      export_records: exportRecords.map(r => ({
        id: r.id,
        proposal_id: r.proposal_id,
        file_name: r.file_name
      }))
    });

  } catch (error) {
    console.error('Batch export error:', error);
    return Response.json({ 
      error: 'Failed to generate batch export',
      details: error.message 
    }, { status: 500 });
  }
});

// ==================== DOCX Generation ====================
async function generateDOCX(proposal, sections, shouldWatermark, options) {
  const docSections = [];

  // Cover page
  if (options.includeCoverPage !== false) {
    docSections.push(
      new Paragraph({
        text: proposal.proposal_name,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: proposal.project_title || '',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: proposal.agency_name || '',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: proposal.solicitation_number || '',
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: `Generated: ${new Date().toLocaleDateString()}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    if (shouldWatermark) {
      docSections.push(
        new Paragraph({
          text: "*** DRAFT VERSION - FOR REVIEW ONLY ***",
          alignment: AlignmentType.CENTER,
          bold: true,
          color: "FF6600",
          spacing: { before: 400 }
        })
      );
    }
  }

  // Add sections
  sections.forEach((section) => {
    docSections.push(
      new Paragraph({
        text: section.section_name,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        pageBreakBefore: true
      })
    );

    if (section.content) {
      const plainText = section.content.replace(/<[^>]*>/g, '').trim();
      const paragraphs = plainText.split('\n\n');
      
      paragraphs.forEach(para => {
        if (para.trim()) {
          docSections.push(
            new Paragraph({
              text: para.trim(),
              spacing: { after: 200 }
            })
          );
        }
      });
    }
  });

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: docSections
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = proposal.proposal_name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  const fileName = `${safeName}_${timestamp}.docx`;

  return { blob, fileName };
}

// ==================== PDF Generation ====================
async function generatePDF(proposal, sections, shouldWatermark, options) {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;

  const addWatermark = () => {
    if (!shouldWatermark) return;
    
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.15 }));
    doc.setFontSize(80);
    doc.setTextColor(200, 200, 200);
    doc.text('DRAFT', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    doc.restoreGraphicsState();
  };

  const checkPage = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      addWatermark();
      yPosition = 20;
    }
  };

  addWatermark();

  // Cover page
  if (options.includeCoverPage !== false) {
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text(proposal.proposal_name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(14);
    doc.setFont(undefined, 'normal');
    if (proposal.project_title) {
      doc.text(proposal.project_title, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }
    if (proposal.agency_name) {
      doc.text(proposal.agency_name, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }

    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

    if (shouldWatermark) {
      yPosition += 20;
      doc.setFontSize(12);
      doc.setTextColor(255, 102, 0);
      doc.setFont(undefined, 'bold');
      doc.text('*** DRAFT VERSION - FOR REVIEW ONLY ***', pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    }

    doc.addPage();
    addWatermark();
    yPosition = 20;
  }

  // Add sections
  sections.forEach((section) => {
    checkPage(30);

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(section.section_name, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    if (section.content) {
      const plainText = section.content.replace(/<[^>]*>/g, '').trim();
      const paragraphs = plainText.split('\n\n');

      paragraphs.forEach(para => {
        if (para.trim()) {
          const lines = doc.splitTextToSize(para.trim(), maxWidth);
          lines.forEach(line => {
            checkPage();
            doc.text(line, margin, yPosition);
            yPosition += 6;
          });
          yPosition += 4;
        }
      });
    }

    yPosition += 10;
  });

  const pdfBlob = doc.output('blob');

  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = proposal.proposal_name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  const fileName = `${safeName}_${timestamp}.pdf`;

  return { blob: pdfBlob, fileName };
}