//
// This code is for reference and demonstration purposes only. It is offered 'as-is' with
// no warranties, express or implied.
//
// (c) Amazon Web Services, 2019
// authors: Leo Chan
//

import * as s from 'module://sumerian-common/api';
import * as si from 'module://sumerian-common/internal';

export default class SurfaceText extends s.Action {

  static get PROPERTIES() {
    return {
      textureSize: {
        order:        0,
        type:         s.type.Float,
        control:      s.control.Select,
        description: 'Texture dimensions in pixels. Smaller values will save memory, larger values will result in smoother text',
        options:      [ 256, 512, 1024, 2048, 4096 ],
        default:      512,
      },
      textOffset: {
        order:        1,
        type:         s.type.Vector2,
        description: 'Text offset, scaled from 0 to 1',
        default:      [ 0, 0 ],
      },
      backgroundOpacity: {
        order:   2,
        type:    s.type.Float,
        control: s.control.Slider,
        min:     0,
        max:     1,
        default: 0,
      },
      backgroundColor: {
        order:   3,
        type:    s.type.Vector3,
        control: s.control.Color,
        default: s.color.White,
      },
      textColor: {
        order:   4,
        type:    s.type.Vector3,
        control: s.control.Color,
        default: s.color.White,
      },
      fontFamily: {
        order:        5,
        type:         s.type.String,
        description: 'CSS Font Family. See https://developer.mozilla.org/en-US/docs/Web/CSS/font-family for details.',
        default:     '"Helvetica Neue", Helvetica, Arial, sans-serif',
      },
      fontStyle: {
        order:        6,
        type:         s.type.String,
        control:      s.control.Select,
        description: 'Sets whether a font should be styled with a normal, italic, or oblique face from its font family.',
        options:      [ 'normal', 'bold', 'italic', 'oblique'],
        default:     'normal',
      },
      fontSize: {
        order:        7,
        type:         s.type.Integer,
        description: 'Font size in texture pixels',
        control:      s.control.Slider,
        min:          1,
        max:          512,
        step:         1,
        default:      50,
      },
      textAlign: {
        order:      8,
        type:       s.type.String,
        control:    s.control.Select,
        options: [ 'left', 'center', 'right' ],
        default:   'center' ,
      },
      verticalAlign: {
        order:      9,
        type:       s.type.String,
        control:    s.control.Select,
        options: [ 'top', 'middle', 'bottom' ],
        default:   'middle',
      },
      text: {
        order:        10,
        type:         s.type.String,
        description: 'Text to display, use “\n” for multi-line text',
        default:     'SurfaceText :)',
      }
    };
  }

  static get SIGNALS() {
    return {
      onSuccess: {
        description: 'Triggered when text rendering is complete',
      },
      onFailure: {
        description: 'Triggered when there is an error in text rendering ',
      },
    };
  }

  start(ctx) {
    ctx.autoStop = false;

    // Start the displaySurfaceText action function when this action starts
    ctx.start(
      ctx => this.displaySurfaceText(ctx, {text: this.text})
    );

    // Set up an entity event listener to update text. Call it by getting the entity
    // this script is on and calling entity.event('updateText').emit('New Text')
    ctx.entity.event('updateText').listen(ctx, text => this.displaySurfaceText(ctx, {text}));
  }

  // ___________________________________________________________________________________________

  //
  // displaySurfaceText: renders text on a texture
  // with a transparent background onto the entity.
  //
  // @param {Object} ctx - The calling action's context object
  // @param {Object} options - Text configuration options with following properties
  //   entity: (required) The ctx.entity object the script is on
  //   text: The text to render. Use the character string \n for newlines
  //   textureSize: Integer dimension of the texture. Use a power of two (64,128,256,512,1024,...)
  //   fontFamily: See https://developer.mozilla.org/en-US/docs/Web/CSS/font-family. For example, '"Helvetica Neue", Helvetica, Arial, sans-serif',
  //   fontStyle: 'normal'|'bold'|'italic'|'oblique'
  //   fontSize: Font size string, e.g., '128px'
  //   textAlign: 'left'|'right'|'center' - center is the default
  //   verticalAlign: 'top'|'bottom'|'middle' - middle is the default
  //   fillStyle: Color to use for the text, in hex or common color name. 'white' is the default.
  //
  displaySurfaceText(ctx, options) {

    // Use the 'default' values set in the SurfaceText PROPERTIES as default values
    const defaultOptions = Object.entries(SurfaceText.PROPERTIES).reduce(
      (accumulator, entry) => {
        accumulator[entry[0]] = entry[1].default;
        return accumulator;
      }, {});
    // Collect options for this object's properties and the passed in options object
    const in_options = {
      textureSize: this.textureSize,
      textOffset: this.textOffset,
      textColor: this.textColor,
      textAlign: this.textAlign,
      verticalAlign: this.verticalAlign,
      backgroundColor: this.backgroundColor,
      backgroundOpacity: this.backgroundOpacity,
      fontFamily: this.fontFamily,
      fontStyle: this.fontStyle,
      fontSize: this.fontSize + 'px',
      entity: ctx.entity,
      text: options.text
    };
    this.options = {};

    //
    // numberToHexString
    // Convert a normalized number [0,1] to hexadecimal string representation
    //
    // @param {Number} n
    //
    const numberToHexString = ( n ) => Math.floor(
        Math.max( 0, Math.min( 1, Number( n ))) * 255
      )
      .toString( 16 )
      .padStart( 2, '0' );

    //
    // vector3ToHex
    // Convert a Vector3 normalized RGB color to hexadecimal string representation
    //
    // @param {Vector3} vector3ToConvert
    //
    const vector3ToHex = (vector3ToConvert) => '#' +
      numberToHexString(vector3ToConvert.x) +
      numberToHexString(vector3ToConvert.y) +
      numberToHexString(vector3ToConvert.z);

    //
    // wordWrap: insert newlines for wordWrap using the provided canvasContext
    //
    // @param {Object} canvasContext 2D canvas context used to measure the text
    // @param {String} text String to word wrap. This may contain the string \n which is treated as a newline
    //
    const wordWrap = (canvasContext, text) => {
      const lines = [];
      const newlineLines = text.split('\\n');
      for(let line of newlineLines) {
        const space  = ' ';
        const words = line.split(space);

        if (words.length <= 1) {
          lines.push(line);
        } else {
          let lineLast   = words.shift();   // pop the first element of the words array
          let lineLength = 0;

          for (let word of words) {
            lineLength = canvasContext.measureText(lineLast + space + word).width;
            if( lineLength < canvasContext.canvas.width) {
              lineLast += (space + word);
            } else {
              lines.push(lineLast);
              lineLast = word;
            }
          }
          lines.push(lineLast);
        }
      }
      return lines;
    };

    // Let's cascade our options from defaults to custom options
    Object.assign(this.options, defaultOptions, in_options);

    // Additional computed default options
    this.options.font = options.font || `${this.options.fontStyle} ${this.options.fontSize} ${this.options.fontFamily}`;
    if (this.options.textColor) {
      this.options.fillStyle = vector3ToHex(this.options.textColor);
    }

    // Create a shared canvas per entity to render text. We can't share it globally, unfortunately, because
    // the material uses a reference to the canvas (set in setImage) and defers its usage until it renders.
    const entityCanvasContext = ctx.entity.value('text-canvas-channel');
    let canvasContext = entityCanvasContext.get();
    if(!canvasContext) {
      entityCanvasContext.set(document.createElement( 'canvas' ).getContext('2d'));
      canvasContext = entityCanvasContext.get();
    }

    if(!canvasContext) {
      console.log("[displaySurfaceText] Error: can't get canvas context! Aborting surface text render.");
      ctx.signal(this.onFailure);
      return;
    }

    // Configure the canvas
    canvasContext.canvas.width = this.options.textureSize;
    canvasContext.canvas.height = this.options.textureSize;
    canvasContext.font = this.options.font;
    canvasContext.textAlign = this.options.textAlign;
    canvasContext.fillStyle = this.options.fillStyle;
    canvasContext.textBaseline = this.options.verticalAlign;
    canvasContext.text = this.options.text;

    // Render the text on the canvas
    const lines = wordWrap(canvasContext, this.options.text);
    const lineHeight = options.lineHeight || parseFloat( this.options.fontSize ) * 1.2;
    let x = 0;
    let y = 0;
    if( this.options.textAlign === 'left' ) x = 0;
    else if( this.options.textAlign === 'right' ) x = canvasContext.canvas.width;
    else x = Math.floor(canvasContext.canvas.width / 2);

    if( this.options.verticalAlign === 'top' ) y = 0;
    else if( this.options.verticalAlign === 'bottom' ) y = Math.floor(canvasContext.canvas.height - lineHeight * (lines.length-1));
    else y = Math.floor((canvasContext.canvas.height - lineHeight * (lines.length - 1)) / 2 );

    x += Math.floor(this.options.textOffset.x * canvasContext.canvas.width);
    y += Math.floor(this.options.textOffset.y * canvasContext.canvas.height);

    canvasContext.clearRect( 0, 0, canvasContext.canvas.width, canvasContext.canvas.height );
    canvasContext.fillStyle = vector3ToHex(this.options.backgroundColor) + numberToHexString(this.options.backgroundOpacity);
    canvasContext.fillRect( 0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
    canvasContext.fillStyle = this.options.fillStyle;
    for( let i = 0; i < lines.length; i ++ ) {
      canvasContext.fillText( lines[ i ], x, y + i * lineHeight );
    }

    // Get or create texture and material on the entity for the text
    const reusableTexture = ctx.entity.value('text-texture-channel');
    let texture = reusableTexture.get();
    if(!texture) {
      reusableTexture.set(new si.Texture( null,
        {
          wrapS: 'EdgeClamp',
          wrapT: 'EdgeClamp',
          premultiplyAlpha: true,
        },
        this.options.textureSize,
        this.options.textureSize));
      texture = reusableTexture.get();
    }
    if(!texture) {
      console.log("[displaySurfaceText] Error: cannot get texture. Aborting text render");
      ctx.signal(this.onFailure);
      return;
    }

    texture.setImage( canvasContext.canvas, canvasContext.canvas.width, canvasContext.canvas.height );

    // Assign texture to a clone of the existing material on the entity. We clone so that entities that happen
    // to share a material don't all end up with the same text.
    const reusableMaterial = ctx.entity.value('text-material-channel');
    let material = reusableMaterial.get();
    const meshRendererComponent = this.options.entity ? si.Entity.forPublicEntity(this.options.entity).meshRendererComponent : null;
    if(!material) {
      if(meshRendererComponent) {
        reusableMaterial.set(meshRendererComponent.materials[0].clone());
        material = reusableMaterial.get();
      } else {
        console.error("[displaySurfaceText] Error: entity not provided to SurfaceTextDisplayer object. Aborting Text Render.");
        ctx.signal(this.onFailure);
        return;
      }
    }
    if(!material || !meshRendererComponent) {
      console.log("[displaySurfaceText] Error: cannot find material on the entity. Aborting text render");
      ctx.signal(this.onFailure);
      return;
    }
    meshRendererComponent.materials[0] = material;

    // Set material properties
    material.blendState.blending = 'TransparencyBlending';
    material.renderQueue = si.RenderQueue.TRANSPARENT;
    material.uniforms.opacity = 1;
    // Assign the texture to the diffuse map - other possibilities include
    // PBR Maps:PBR_SPECULAR_MAP, PBR_GLOSSINESS_MAP, PBR_SPECULAR_GLOSSINESS_MAP,
    // Classic Maps: SPECULAR_MAP, AO_MAP, TRANSPARENCY_MAP, REFLECTION_MAP
    const mapName = (material.shader.name === 'ShaderLib.pbr') ? si.Shader.BASE_COLOR_MAP : si.Shader.DIFFUSE_MAP;
    material.setTexture(mapName, texture);

    // For visual state machines, transition when complete
    ctx.signal(this.onSuccess);
  }
}