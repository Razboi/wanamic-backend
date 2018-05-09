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
	Notification = require( "./models/Notification" ),
	User = require( "./models/User" ),
	socketIo = require( "socket.io" );

var oldNotifications = [];
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
	var
		areEqual = true,
		i;
	User.findById( userId )
		.populate({
			path: "notifications"
		})
		.exec()
		.then( user => {
			if ( oldNotifications.length > 0 ) {
				if ( oldNotifications.length !== user.notifications.length ) {
					areEqual = false;
				} else {
					for ( i = 0; i < user.notifications.length; i++ ) {
						if ( String( user.notifications[ i ]._id )
								!==
								String( oldNotifications[ i ]._id )) {
							areEqual = false;
							break;
						}
					}
				}

				if ( user.notifications.length > 0 && !areEqual ) {
					console.log( "there are new notifications" );
					const newNotifications = user.notifications.filter( notification => {
						return notification.checked === false;
					});
					try {
						socket.emit( "notifications", {
							notifications: user.notifications,
							newNotifications: newNotifications
						});
						oldNotifications = user.notifications;
					} catch ( err ) {
						console.log( err );
					}
				}
			} else {
				console.log( "setup" );
				oldNotifications = user.notifications;
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

		setInterval(() => getNotifiacionsAndEmit( socket, userId ), 5000 );
	});

	socket.on( "disconnect", () => {
		socket.disconnect();
		console.log( "Client disconnected" );
	});
});
