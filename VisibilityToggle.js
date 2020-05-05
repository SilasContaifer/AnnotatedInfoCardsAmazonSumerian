///////////// VisibilityToggle
//place on cards

import * as s from 'module://sumerian-common/api';

export const PROPERTIES = {
	toggleEventName: {
		type: s.type.String
	}
};

export default function(ctx, props) {

	// Start with the entity hidden.
	ctx.entity.hide();

	// Whenever the specified event occurs toggle the visibility of the entity.
	ctx.world.event(props.toggleEventName).monitor(ctx, (isScript) => {
		if (isScript) {

		if (ctx.entity.isHidden) {
			ctx.entity.show();
		} else {
			ctx.entity.hide();
			}
		} else {ctx.entity.hide();}
	});
}