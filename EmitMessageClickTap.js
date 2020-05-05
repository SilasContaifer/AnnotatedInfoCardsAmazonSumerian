import * as s from 'module://sumerian-common/api';

export const PROPERTIES = {
	eventName: {
		type: s.type.String,
		description: 'The event to emit'
	}
};

export default function(ctx, props) {

	ctx.start(
		[s.input.ClickAction, {
			onClick: () => {
				ctx.world.event(props.eventName).emit(
					true
				);
			}
		}]
	);
}