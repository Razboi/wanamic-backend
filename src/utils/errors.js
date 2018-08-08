module.exports = {
	blankData: () => {
		var err = new Error( "Required data not found" );
		err.statusCode = 422;
		return err;
	},
	userDoesntExist: () => {
		var err = new Error( "User doesn't exist" );
		err.statusCode = 404;
		return err;
	},
	postDoesntExist: () => {
		var err = new Error( "Post doesn't exist" );
		err.statusCode = 404;
		return err;
	},
	commentDoesntExist: () => {
		var err = new Error( "Comment doesn't exist" );
		err.statusCode = 404;
		return err;
	},
	conversationDoesntExist: () => {
		var err = new Error( "Conversation doesn't exist" );
		err.statusCode = 404;
		return err;
	},
	notificationDoesntExist: () => {
		var err = new Error( "Notification doesn't exist" );
		err.statusCode = 404;
		return err;
	},
	registeredUsername: () => {
		var err = new Error( "Username already registered" );
		err.statusCode = 422;
		return err;
	},
	registeredEmail: () => {
		var err = new Error( "Email already registered" );
		err.statusCode = 422;
		return err;
	},
	invalidEmail: () => {
		var err = new Error( "Email is not registered" );
		err.statusCode = 404;
		return err;
	},
	invalidEmailFormat: () => {
		var err = new Error( "Invalid email format" );
		err.statusCode = 422;
		return err;
	},
	invalidPassword: () => {
		var err = new Error( "Invalid password" );
		err.statusCode = 401;
		return err;
	},
	invalidPasswordFormat: () => {
		var err = new Error( "Invalid password format" );
		err.statusCode = 422;
		return err;
	},
	unauthorized: () => {
		var err = new Error( "Unauthorized" );
		err.statusCode = 401;
		return err;
	},
	duplicatedNotification: () => {
		var err = new Error( "Duplicated notification" );
		err.statusCode = 422;
		return err;
	},
	alreadyRelated: () => {
		var err = new Error( "Users already have this relation or a higher one" );
		err.statusCode = 422;
		return err;
	},
	invalidLink: () => {
		var err = new Error( "The link that you provided isn't returning the necessary data for a preview." +
		" Try sharing it through a text post." );
		err.statusCode = 422;
		return err;
	},
	invalidUsernameFormat: () => {
		var err = new Error( "The username format is invalid" );
		err.statusCode = 422;
		return err;
	},
	invalidFullnameFormat: () => {
		var err = new Error( "The fullname format is invalid" );
		err.statusCode = 422;
		return err;
	}
};
