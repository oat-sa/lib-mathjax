requirejs.config({
    baseUrl : '../dist',
    config : {
        'MathJax/MathJax' : {
            root : '../dist/'       //where MathJax will look for it's fonts
        },
    }
});

require(['MathJax.min'], function(M){
    console.log(M.Hub.Config());
});
