const express = require("express")
const http = require("http");
const path = require("path")
const socketio = require("socket.io")

const app = express();

const server = http.createServer(app)

app.use(express.static(path.join(__dirname, "public")))

const io = socketio(server);

const {connectedUsers, initializeChoices, userConnected, makeMove, moves, choices} = require('./util/users')
const {rooms, createRoom, joinRoom, exitRoom} = require('./util/rooms')

io.on("connection", socket => {
    socket.on('create-room', (roomId) => {
        if(rooms[roomId]){
            const error = "This room already exists"
            socket.emit("display-error", error)
        }else{
            userConnected(socket.client.id)
            createRoom(roomId, socket.client.id)
            socket.emit('room-created', roomId)
            socket.emit('player-1-connected')
            console.log('player 1 connected')
            socket.join(roomId)
        }
    })

    socket.on('join-room', roomId => { 
        if(!rooms[roomId]){
            const error = "This room doesn't exist"
            socket.emit('display-error', error)
        }else{
            userConnected(socket.client.id)
            joinRoom(roomId, socket.client.id)
            socket.join(roomId)
            socket.emit('room-joined', roomId)
            socket.emit('player-2-connected')
            socket.broadcast.to(roomId).emit('player-2-connected')
            console.log('player 2 connected')
            initializeChoices(roomId)
        }
    })

    socket.on('join-random', () => {
        let roomId = ""
        for(let id in rooms){
            if(rooms[id][1] === ""){
                roomId = id
                break;
            }
        }

        if(roomId === ""){
            const error = "All rooms are full or none exists"
            socket.emit("display-error", error)
        }else{
            userConnected(socket.client.id)
            joinRoom(roomId, socket.client.id)
            socket.join(roomId)
            socket.emit('room-joined', roomId)
            socket.emit('player-2-connected')
            socket.broadcast.to(roomId).emit('player-2-connected')
            console.log('player 2 connected')
            initializeChoices(roomId)
        }
    })

    socket.on('make-move', ({roomId, playerId, myChoice}) => {
        makeMove(roomId, playerId, myChoice)
        if(choices[roomId][0] !== "" && choices[roomId][1] !== ""){
            let playerOneChoice = choices[roomId][0]
            let playerTwoChoice = choices[roomId][1]

            if(playerOneChoice === playerTwoChoice) {
                let message = "Both of you chose " + playerOneChoice + "...So it's a draw"
                io.to(roomId).emit('draw ', message)
                choices[rooms] = ["", ""]
            }else if(moves[playerOneChoice] === playerTwoChoice){
                let enemyChoice = ""
                if(playerId === 1){
                    enemyChoice = playerTwoChoice
                }else{
                    enemenyChoice = playerTwoChoice
                }
                choices[roomId] = ["", ""]
                io.to(roomId).emit('player-1-wins', {myChoice, enemyChoice})
            }else{
                let enemyChoice = ""
                if(playerId === 1){
                    enemyChoice = playerTwoChoice
                }else{
                    enemenyChoice = playerTwoChoice
                }
                choices[roomId] = ["", ""]
                io.to(roomId).emit('player-2-wins', {myChoice, enemyChoice})
            }
            choices[roomId] = ["", ""]
        }
    })

    socket.on('disconnect', () => {
        if(connectedUsers[socket.client.id]){
            let player
            let roomId

            for(let id in rooms){
                if(rooms[id][0] === socket.client.id || rooms[id][1] === socket.client.id){
                    if(rooms[id][0] === socket.client.id){
                        player = 1
                    }else{
                        player = 2
                    }
                    roomId = id
                    break;
                }
            }
            exitRoom(roomId, player)
            if(player === 1){
                io.to(roomId).emit('player-1-disconnected')
                console.log('player 1 disconnected')
            }else{
                io.to(roomId).emit('player-2-disconnected')
                console.log('player 2 disconnected')
            }
        }
    })
})

server.listen(3000, () => console.log("server started on port 3000"));