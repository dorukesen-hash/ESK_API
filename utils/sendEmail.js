// 3rd party
const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')
const handlebars = require('handlebars')

const sendEmail = async (options) => {
    const orderSuccess = path.join(
        __dirname,
        './emailTemplates/orderSuccess.html'
    )
    const resetPasswordPath = path.join(
        __dirname,
        './emailTemplates/resetPasswordTemplate.html'
    )
    const claimReceivedPath = path.join(
        __dirname,
        './emailTemplates/claimReceived.html'
    )
    let filePath
    const findPath = () => {
        if (options.subject === 'ESK Packaging - Order Success') {
            filePath = orderSuccess
        } else if (options.subject === 'Reset Password') {
            filePath = resetPasswordPath
        } else if (options.subject === 'New Customer Claim Received' || options.subject === 'ESK Packaging - Claim Received') {
            filePath = claimReceivedPath
        }

        return filePath
    }
    const source = fs.readFileSync(findPath(), 'utf-8').toString()
    const template = handlebars.compile(source)
    const replacements = {
        username: options.username,
        orderNumber: options.orderNumber,
        subtotal: options.subtotal,
        items: options.items,
        price: options.price,
        shipping: options.shipping,
        resetURL: options.resetURL,
        claim: options.claim || null,
        customer: options.customer || null,
    }
    const htmlToSend = template(replacements)

    const transporter = nodemailer.createTransport({
        host: process.env.SMPT_HOST,
        port: process.env.SMPT_PORT,
        auth: {
            user: process.env.SMPT_MAIL, // generated ethereal user
            pass: process.env.SMPT_PASSWORD, // generated ethereal password
        },
    })

    const mailOptions = {
        from: process.env.SMPT_MAIL,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: htmlToSend,
        attachments: [
            {
                filename: 'ESK_icon.png',
                path: path.join(
                    __dirname.replace('utils', 'public/images/ESK_icon.png')
                ),
                cid: 'logo', //same cid value as in the html img src
            },
        ],
    }
    console.log(mailOptions)
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error)
        } else {
            console.log('Email sent: ' + info.response)
        }
    })
}

module.exports = sendEmail
