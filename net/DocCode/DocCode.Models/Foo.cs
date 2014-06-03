namespace FooBar.Models
{
    public class Foo
    {
        public int ID { get; set; }
        public string Name { get; set; }
        public string SomethingVeryBig { get; set; }
        public Color Color { get; set; }
    }

    public enum Color
    {
         Violet, Blue, Green, Yellow, Orange, Red 
    }
}
