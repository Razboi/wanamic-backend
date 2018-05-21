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
	notifications = require( "./routes/notifications" ),
	messages = require( "./routes/messages" ),
	Notification = require( "./models/Notification" ),
	User = require( "./models/User" ),
	Message = require( "./models/Message" ),
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
app.use( "/notifications", notifications );
app.use( "/messages", messages );

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


io.on( "connection", socket => {
	console.log( "New client" );
	socket.on( "register", data => {
		try {
			tokenVerifier( data.token, userId => {
				User.findById( userId )
					.exec()
					.then( user => socket.join( user.username ));
			});
		} catch ( err ) {
			console.log( err );
			return err;
		}
	});

	socket.on( "sendMessage", data => {
		if ( data && data.receiver ) {
			try {
				socket.to( data.receiver ).emit( "message", data );
			} catch ( err ) {
				console.log( err );
			}
		}
	});

	socket.on( "sendNotification", data => {
		if ( data && data.receiver ) {
			try {
				socket.to( data.receiver ).emit( "notifications", data );
			} catch ( err ) {
				console.log( err );
			}
		}
	});

	socket.on( "disconnect", () => {
		socket.disconnect();
		console.log( "Client disconnected" );
	});
});
