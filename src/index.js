const
	app = require( "express" )(),
	bodyParser = require( "body-parser" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ).config(),
	posts = require( "./routes/posts" ),
	comments = require( "./routes/comments" ),
	friends = require( "./routes/friends" ),
	followers = require( "./routes/followers" ),
	user = require( "./routes/user" ),
	auth = require( "./routes/auth" ),
	notifications = require( "./routes/notifications" ),
	conversations = require( "./routes/conversations" ),
	admin = require( "./routes/admin" ),
	Notification = require( "./models/Notification" ),
	User = require( "./models/User" ),
	Message = require( "./models/Message" ),
	socketIo = require( "socket.io" );


let mongoURL = process.env.NODE_ENV === "dev" ?
	process.env.DEV_MONGODB_URL : process.env.PROD_MONGODB_URL;

mongoose.connect( mongoURL, { useNewUrlParser: true }).then(() => {
	console.log( "MongoDB connected" );
}).catch( err => console.log( err ));

app.use( bodyParser.json());
app.use(( req, res, next ) => {
	res.header( "Access-Control-Allow-Origin", "*" );
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization"
	);
	if ( req.method === "OPTIONS" ) {
		res.header( "Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET" );
		return res.sendStatus( 200 );
	}
	next();
});
app.use( "/auth", auth );
app.use( "/posts", posts );
app.use( "/friends", friends );
app.use( "/user", user );
app.use( "/followers", followers );
app.use( "/comments", comments );
app.use( "/notifications", notifications );
app.use( "/conversations", conversations );
app.use( "/admin", admin );

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
	socket.on( "register", data => {
		try {
			tokenVerifier( data.token, userId => {
				User.findById( userId )
					.exec()
					.then( user => socket.join( user._id ));
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
	});
});
