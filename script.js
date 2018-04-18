let fs = require('fs')
const _cliProgress = require('cli-progress')
const readlineSync = require('readline-sync');
let emojiRegex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/ug
let monthsArray = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sept", "oct", "nov", "dec"]
let html = []
let f = 0

fs.readFile('./months.txt', 'utf8', function (err, data) { //read
    let potMonthsArray = data.split(",")
    for (let i = 0; i < potMonthsArray.length; i++)
        potMonthsArray[i] = potMonthsArray[i].toLowerCase().trim()
    if (potMonthsArray.length < 12) {
        console.log("     months.txt contains less than 12 months\n     be sure to put a ',' between months\n    results will be incorrect")
        exit()
    } else monthsArray = potMonthsArray
})



console.log("if you crash on an invalid month, please change the month.txt to the appropriate language")
let ownerName = readlineSync.question('What is your facebook name? (for analyzing purposes)');
ownerName = ownerName.toLowerCase().replace(/ /g, '');
fs.readdir("./input/", (err, files) => {
    for (let t = 0; t < files.length; t++) {
        if (files[t].endsWith('.html')) html.push(files[t])
    }
    if (html.length > 0)
        convertFile(html[f])
    else console.log("no files found")
})



function convertFile(file) {
    console.log("=================================\n" + file)
    inp = file.replace('.html', '')
    fs.readFile('./input/' + inp + '.html', 'utf8', function (err, data) {
        if (err) throw err
        let messages = []
        data = data.split('/h3>')[1]
        if (!data.includes('class="message')) { //when no messages are found
            console.log("empty chat, cannot continue")

        } else {
            data = data.replace("\n", "").replace("\r", "")
            //puts spaces before '<' and after '>'
            let nD = ""
            for (let i = 0; i < data.length; i++) {
                if (data[i] === '<') nD += " "
                nD += data[i]
                if (data[i] === '>') nD += " "
            }
            let nnD = ""
            let dataWords = nD.split(" ");
            for (let i = 0; i < dataWords.length; i++) { //puts newlines after the right html tags
                if (dataWords[i]) {
                    nnD += dataWords[i] + " "
                    if (dataWords[i] === "</p>" ||
                        dataWords[i] === "</div>" ||
                        dataWords[i] === 'class="message">') nnD += "\n"
                }
            }
            data = nnD
            let divs = data.split('\n') //split on newlines
            divs.splice(0, 1)
            divs.splice(divs.length - 1, 1)

            //start progress bar
            const bar = new _cliProgress.Bar({
                format: 'converting: [{bar}] {percentage}%'
            }, _cliProgress.Presets.shades_classic)
            bar.start(divs.lenght, 0)


            //data prep
            for (let i = divs.length - 1; i >= 0; i--) { //backwards because we're removing stuff from the arrays as we go

                divs[i] = divs[i].trim()
                //remove excess divs
                divs[i] = divs[i].replace('\r', '')
                divs[i] = divs[i].replace('<div class="message_header">', '')
                divs[i] = divs[i].replace('<span class="meta">', '')
                divs[i] = divs[i].replace('<span class="user">', '')
                //remove 'empty' lines
                if (divs[i].includes('class="message"') || divs[i] === '</div>' || divs[i] === '<p>' || divs[i] === '</p>') {
                    divs.splice(i, 1)
                }

                //update progress bar
                let p = Math.round((1 - (i / divs.length)) * 100)
                bar.update(p)

            }
            bar.stop();
            const bar2 = new _cliProgress.Bar({
                format: 'preparing: [{bar}] {percentage}%'
            }, _cliProgress.Presets.shades_classic)
            bar2.start(divs.lenght, 0)

            let msg = {}
            //put lines of data into useful objects
            for (let i = 0; i < divs.length; i++) {
                let p = Math.round((i / divs.length) * 100)
                bar2.update(p)
                if (divs[i].endsWith('</div>')) { //if data line

                    let parts = divs[i].split("</span>") //split on span tag
                    parts[0] = parts[0].replace(/ /g, "")
                    if (parts[0].toLowerCase().includes(ownerName)) msg.user = 'me'
                    else msg.user = parts[0]
                    let dateTimeStr = parts[1].trim()

                    let day = 0
                    let month = searchMonthInString(dateTimeStr)
                    let year = 0,
                        hours = 0,
                        minutes = 0

                    let dateparts = dateTimeStr.replace(/[-\/.,]/g, " ").split(' ')
                    for (let t = 0; t < dateparts.length; t++) {
                        if (dateparts[t]) {
                            if (dateparts[t].match(/^[0-9]{1,2}/)) { //if starts with 2 numbers
                                let onlyNumber = dateparts[t].replace(/[^0-9.]/g, ""); //remove all but numbers
                                if (onlyNumber.length <= 2 && parseInt(onlyNumber) && parseInt(onlyNumber) < 32) //only 2 or less chars, IS something and is less than 32
                                    day = parseInt(onlyNumber)
                            }
                            let potTime = dateparts[t].split(':') //potential time
                            if (potTime.length > 1) {
                                hours = parseInt(potTime[0])
                                minutes = parseInt(potTime[1])
                            }
                            if (dateparts[t].match(/^[0-9]{4}/) && parseInt(dateparts[t]) >= 2004) { //has for numbers and is greater than 2004
                                year = parseInt(dateparts[t])
                            }
                        }
                    }
                    if (dateTimeStr.toLowerCase().includes('pm')) {
                        hours += 12
                        if (hours > 23) hours = 12
                    } else if (dateTimeStr.toLowerCase().includes('am') && hours == 12) {
                        hours = 0
                    }
                    let newDate = new Date(year, month, day, hours, minutes, 0, 0)

                    msg.time = newDate.toJSON()

                }
                if (divs[i].endsWith('</p>')) { //if message line
                    let mes = divs[i].replace('</p>', '').replace(/<p>/g, '') //remove tags
                    let nospace = mes.replace(/ /g, '')
                    if (nospace) {
                        msg.message = mes
                        messages.push(msg)
                    }
                    msg = {}
                }

            }
            bar2.stop()
            analyze(messages, inp)
        }
        f++
        if (f < html.length) {
            convertFile(html[f])
        } else exit()

    })

}


//start analyzing chat
function analyze(chat, inp) {
    let users = []
    let total = {
        wordCount: 0,
        messageCount: 0,
        photoShared: 0,
        stickers: [],
        wordsSaid: [],
        emojis: []
    }

    const bar = new _cliProgress.Bar({
        format: 'analyzing data: [{bar}] {percentage}%'
    }, _cliProgress.Presets.shades_classic)
    bar.start(chat.lenght, 0)

    //go through every message and add data
    for (let i = 0; i < chat.length; i++) {
        let u = findUser(chat[i].user)
        let time = new Date(chat[i].time)
        let year = time.getFullYear()
        //add new year object if it doesn't already exist
        if (!u[year]) u[year] = {
            byHour: {},
            byMonth: {},
            byDay: {},
            photoShared: 0,
            wordCount: 0,
            messageCount: 0,
        }
        //add to messagecount
        total.messageCount += 1
        u.messageCount += 1
        u[year].messageCount += 1

        //add byHour
        let hour = time.getHours()

        if (!u[year].byHour[hour])
            u[year].byHour[hour] = 0
        u[year].byHour[hour] += 1

        if (!u.byHour[hour])
            u.byHour[hour] = 0
        u.byHour[hour] += 1


        //add byDay
        let day = getDaybyNumber(time.getDay())

        if (!u[year].byDay[day])
            u[year].byDay[day] = 0
        u[year].byDay[day] += 1

        if (!u.byDay[day])
            u.byDay[day] = 0
        u.byDay[day] += 1
        //add byMonth
        let month = getMonthbyNumber(time.getMonth())

        if (!u[year].byMonth[month])
            u[year].byMonth[month] = 0
        u[year].byMonth[month] += 1

        if (!u.byMonth[month])
            u.byMonth[month] = 0
        u.byMonth[month] += 1


        let isImage = false
        let mes = chat[i].message

        //images/stickers
        if (mes.includes("stickers_used")) {
            isImage = true
            let stickerID = mes.split('/')[2].split('.')[0]
            findInArray(total.stickers, stickerID)
            findInArray(u.stickers, stickerID)
        }
        if (mes.includes("messages/photos") || mes.includes("messages/gifs") || mes.includes("messages/videos") || mes.includes("messages/audio") || mes.includes("messages/file")) {
            u[year].photoShared += 1
            u.photoShared += 1
            total.photoShared += 1
            isImage = true
        }
        //words
        if (!isImage) {
            let words = mes.split(" ")
            for (let j = 0; j < words.length; j++) {
                if (words[j] != '' && words[j]) {
                    let isEmoji = false
                    if (words[j].match(emojiRegex)) {
                        findInArray(total.emojis, words[j])
                        findInArray(u.emojis, words[j])
                        isEmoji = true
                    }
                    if (!isEmoji) {
                        let word = words[j].toLowerCase().replace(/[^a-z0-9]/g, '')
                        if (word) {
                            total.wordCount += 1
                            u[year].wordCount += 1
                            u.wordCount += 1

                            findInArray(u.wordsSaid, word)
                            findInArray(total.wordsSaid, word)
                        }
                    }
                }
            }
        }
        let p = Math.round((i / chat.length) * 100)
        bar.update(p)
    }
    bar.stop()

    //sort everything
    for (let i = 0; i < users.length; i++) {
        users[i].stickers.sort(sortOnCount)
        users[i].wordsSaid.sort(sortOnCount)
        users[i].emojis.sort(sortOnCount)
    }
    total.stickers.sort(sortOnCount)
    total.wordsSaid.sort(sortOnCount)
    total.emojis.sort(sortOnCount)

    //export to csv
    let stream = fs.createWriteStream("./output/" + inp + ".csv")
    stream.once('open', function (fd) {
        //total stats
        stream.write("total messages:;" + total.messageCount + ";\n")
        stream.write("total pictures:;" + total.photoShared + ";\n")
        stream.write("total words:;" + total.wordCount + ";\n")
        let tStickers = 0
        for (let s = 0; s < total.stickers.length; s++)
            tStickers += total.stickers[s].count
        stream.write("total stickers used:;" + tStickers + ";\n")

        let header = ";"
        let wordsLine = "words:;"
        let messagesLine = "messages:;"
        let picturesLine = "pictures:;"
        let stickersUsed = "stickers:;"
        for (let u = 0; u < users.length; u++) {
            header += users[u].name + ";"
            wordsLine += users[u].wordCount + ";"
            messagesLine += users[u].messageCount + ";"
            picturesLine += users[u].photoShared + ";"
            let sU = 0
            for (let s = 0; s < users[u].stickers.length; s++)
                sU += users[u].stickers[s].count
            stickersUsed += sU + ";"

        }
        stream.write(header + ";\n" + wordsLine + ";\n" + messagesLine + ";\n" + picturesLine + ";\n" + stickersUsed + ";\n")

        //headers
        stream.write("users; ;per day;   ;   ;    ;   ;   ;   ; ;per month;   ;   ;   ;   ;   ;   ;   ;   ;   ;   ;   ; ;per hour; ; ; ; ; ; ; ; ; ; ; ; ;  ;  ;  ;  ;  ;  ;  ;  ;  ;  ;  ;  ;\n");
        let daysmonthsLine = "     ; ;mon    ;tue;wed;thur;fri;sat;sun; ;"
        for (let m = 0; m < monthsArray.length; m++)
            daysmonthsLine += monthsArray[m] + ";"
        daysmonthsLine += "; 0; 1; 2; 3; 4; 5; 6; 7; 8; 9; 10; 11; 12; 13; 14; 15; 16; 17; 18; 19; 20; 21; 22; 23 \n "
        stream.write(daysmonthsLine)
        for (let y = 2004; y <= new Date().getFullYear(); y++) {
            let year = false;
            let yearPart = "";
            for (let u = 0; u < users.length; u++) {
                if (users[u][y]) {
                    year = true;
                    let us = users[u]
                    let line = us.name + "; ;"

                    for (let d = 0; d < 7; d++) {
                        let number = us[y].byDay[getDaybyNumber(d)]
                        if (!number) number = 0
                        line += number + ";"
                    }
                    line += " ;"
                    for (let m = 0; m < 12; m++) {
                        let number = us[y].byMonth[getMonthbyNumber(m)]
                        if (!number) number = 0
                        line += number + ";"
                    }
                    line += " ;"
                    for (let h = 0; h < 24; h++) {
                        let number = us[y].byHour[h]
                        if (!number) number = 0
                        line += number + ";"
                    }
                    yearPart += (line + "\n")
                }

            }
            if (year)
                stream.write(y + ";\n" + yearPart + "\n")
        }
        stream.write("all time;\n")
        for (let u = 0; u < users.length; u++) {
            let us = users[u]
            let line = us.name + "; ;"

            for (let d = 0; d < 7; d++) {
                let number = us.byDay[getDaybyNumber(d)]
                if (!number) number = 0
                line += number + ";"
            }
            line += " ;"
            for (let m = 0; m < 12; m++) {
                let number = us.byMonth[getMonthbyNumber(m)]
                if (!number) number = 0
                line += number + ";"
            }
            line += " ;"
            for (let h = 0; h < 24; h++) {
                let number = us.byHour[h]
                if (!number) number = 0
                line += number + ";"
            }
            line += ";" + us.photoShared
            stream.write(line + "\n")
        }
        stream.write("\n\ntop15;\n ;words; ;stickers; ;emojis; ;\n")
        let top = ""
        for (let t = 0; t < 100; t++) {
            top += (t + 1) + ";"
            if (total.wordsSaid[t])
                top += total.wordsSaid[t].name + ";" + total.wordsSaid[t].count + ";"
            else top += "; ;"
            if (total.stickers[t])
                top += total.stickers[t].name + ";" + total.stickers[t].count + ";"
            else top += "; ;"
            if (total.emojis[t])
                top += total.emojis[t].name + ";" + total.emojis[t].count + ";"
            else top += "; ;"
            top += ";\n"
        }
        stream.write(top)


        stream.end()
    })
    console.log("Finished! find the data at /output/" + inp + ".csv")

    function findUser(name) {
        for (let i = 0; i < users.length; i++) {
            if (users[i].name === name) return users[i]
        }
        let newUser = {
            name: name,
            byHour: {},
            byMonth: {},
            byDay: {},
            wordCount: 0,
            messageCount: 0,
            stickers: [],
            photoShared: 0,
            wordsSaid: [],
            emojis: []
        }
        users.push(newUser)
        return newUser
    }
}

function searchMonthInString(string) {
    string = string.toLowerCase()
    for (let i = 0; i < monthsArray.length; i++) {
        if (string.includes(monthsArray[i])) return i
    }
}


//helper functions
function monthToNumber(month) {
    for (let i = 0; i < monthsArray.length; i++) {
        if (monthsArray[i] === month) return i
    }
}

function exit() {
    readlineSync.question('press any key to continue...');
}

function getDaybyNumber(day) {
    switch (day) {
        case 1:
            return 'mon'
        case 2:
            return 'tue'
        case 3:
            return 'wed'
        case 4:
            return 'thur'
        case 5:
            return 'fri'
        case 6:
            return 'sat'
        case 0:
            return 'sun'
    }
}

function getMonthbyNumber(month) {
    return monthsArray[month]
}

function sortOnCount(a, b) {
    return b.count - a.count
}

function findInArray(array, word) {
    let found = array.find(x => x.name === word)

    if (found) found.count += 1
    else {
        array.push({
            name: word,
            count: 1
        })
    }
}
