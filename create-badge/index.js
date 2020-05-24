var PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-poppler');
var azureStorage = require('azure-storage');

module.exports = async function (context, req) {

  if (req.body) {
    ticketId = req.body.reference;
    fullName = req.body.first_name + req.body.last_name;
    company = req.body.company_name;
    type = 'Attendee';

    context.log(context.executionContext.functionDirectory);

    var filenameBase =
      context.executionContext.functionDirectory + '/tickets/' + ticketId;

    var pdfFileName = filenameBase + '.pdf';

    doc = new PDFDocument({
      size: [1915, 1920],
      autoFirstPage: false,
    });

    doc.pipe(fs.createWriteStream(pdfFileName));

    doc.addPage();

    imageFileName =
      context.executionContext.functionDirectory + '/shield-' + type + '.png';

    fontFileName =
      context.executionContext.functionDirectory + '/NorseBold-2Kge.otf';

    var height = doc.page.height;
    var width = doc.page.height;
    var maxWidth = doc.page.width - 600;
    var margin = 10;

    doc.image(imageFileName, 0, 0, {
      height,
      width,
    });

    // First name
    doc.font(fontFileName).fontSize(180).fillColor('#ffffff');
    if (doc.widthOfString(fullName) > maxWidth) {
      doc.fontSize(140);
      if (doc.widthOfString(fullName) > maxWidth) {
        doc.fontSize(80);
      }
    }

    doc.text(fullName, margin, 1100, {
      align: 'center',
      height,
      width,
    });

    // Company

    if (company) {
      doc.font(fontFileName).fontSize(100).fillColor('#e46025');
      if (doc.widthOfString(company) > maxWidth) {
        doc.fontSize(80);
        if (doc.widthOfString(company) > maxWidth) {
          doc.fontSize(60);
        }
      }
      doc.text(company, margin, 1300, {
        align: 'center',
        height,
        width,
      });
    }

    doc.font(fontFileName).fontSize(80).fillColor('#ffffff');
    if (doc.widthOfString(type) > maxWidth) {
      doc.fontSize(60);
      if (doc.widthOfString(type) > maxWidth) {
        doc.fontSize(40);
      }
    }
    doc.text(type, margin, 1485, {
      align: 'center',
      height,
      width,
    });

    doc.end();

    context.log('Successfully created PDF');

    let opts = {
      format: 'jpeg',
      out_dir: path.dirname(pdfFileName),
      out_prefix: ticketId,
      page: null,
      scale: 957,
    };

    return new Promise((resolve, reject) => {
      pdf.convert(pdfFileName, opts).then((response) => {
        context.log('Successfully converted');

        jpgFileName = path.dirname(pdfFileName) + '/' + ticketId + '-1.jpg';

        var blobService = azureStorage.createBlobService();

        blobService.createBlockBlobFromLocalFile(
          'badges',
          'attendees/' + ticketId + '.jpg',
          jpgFileName,
          function (error, result, response) {
            if (!error) {
              context.log('Successfully uploaded');

              fs.unlinkSync(jpgFileName);
              fs.unlinkSync(pdfFileName);

              context.log('Success with ' + ticketId);

              context.res = {
                body: 'Success with ' + ticketId,
              };
            } else {
              context.res = {
                status: 500,
                body: error,
              };
            }

            context.done();
          }
        );
      });
    });
  } else {
    context.res = {
      status: 400,
      body: 'Please pass a name on the query string or in the request body',
    };
  }

  context.done();
};
