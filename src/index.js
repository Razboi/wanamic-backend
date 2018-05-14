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


function getNotifiacionsAndEmit( socket, userId ) {
	var
		interval,
		areEqual,
		oldNotifications = undefined,
		i;

	interval = setInterval(() => {
		areEqual = true;
		User.findById( userId )
			.populate({
				path: "notifications"
			})
			.exec()
			.then( user => {
				if ( !oldNotifications ) {
					console.log( "setup" );
					oldNotifications = user.notifications;
					return;
				}
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

					socket.emit( "notifications", {
						notifications: user.notifications,
						newNotifications: newNotifications.length
					});
					oldNotifications = user.notifications;
				}
			}).catch( err => console.log( err ));
	}, 5000 );

	socket.on( "disconnect", () => {
		clearInterval( interval );
		socket.disconnect();
		console.log( "Client disconnected" );
	});
}

io.on( "connection", socket => {
	console.log( "New client" );
	socket.on( "register", token => {
		var userId;

		try {
			userId = tokenVerifier( token );
		} catch ( err ) {
			console.log( err );
			return err;
		}
		getNotifiacionsAndEmit( socket, userId );
	});
});
