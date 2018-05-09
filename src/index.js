const
	app = require( "express" )(),
	bodyParser = require( "body-parser" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	posts = require( "./routes/posts" ),
	comments = require( "./routes/comments" ),
	friends = require( "./routes/friends" ),
	followers = require( "./routes/followers" ),
	user = require( "./routes/user" ),
	auth = require( "./routes/auth" ),
	Notification = require( "./models/Notification" ),
	User = require( "./models/User" ),
	socketIo = require( "socket.io" );

// apply env variables
dotenv.config();

mongoose.connect( process.env.MONGODB_URL, () =>
	console.log( "MongoDB connected" ));

app.use( bodyParser.json());
app.use( "/auth", auth );
app.use( "/posts", posts );
app.use( "/friends", friends );
app.use( "/user", user );
app.use( "/followers", followers );
app.use( "/comments", comments );

// error middleware
app.use(( err, req, res, next ) => {
	console.log( err );
	if ( !err.statusCode ) {
		res.status( 500 );
	} else {
		res.status( err.statusCode );
	}
	res.send( err.message );
});

const
	server = app.listen( process.env.APP_PORT, () =>
		console.log( "App listening" )),
	io = socketIo( server );

function getNotifiacionsAndEmit( socket, userId ) {
	User.findById( userId )
		.populate({
			path: "notifications",
			match: { checked: false }
		})
		.exec()
		.then( user => {
			if ( user.notifications.length > 0 ) {
				console.log( "there are new notifications" );
				try {
					socket.emit( "notifications", user.notifications );
				} catch ( err ) {
					console.log( err );
				}
			}
		}).catch( err => console.log( err ));
}

io.on( "connection", socket => {
	console.log( "New client" );
	// register event saves the userId and writes the socketId to the user schema
	socket.on( "register", token => {
		var userId;

		try {
			userId = tokenVerifier( token );
		} catch ( err ) {
			console.log( err );
			return err;
		}

		setInterval(() => getNotifiacionsAndEmit( socket, userId ), 10000 );
	});

	socket.on( "disconnect", () => {
		socket.disconnect();
		console.log( "Client disconnected" );
	});
});
